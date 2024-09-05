package dev.nx.console.project_details.browsers

import com.intellij.ide.ui.laf.darcula.ui.DarculaProgressBarUI
import com.intellij.notification.NotificationType
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import com.intellij.util.ui.UIUtil
import dev.nx.console.graph.NxGraphInteractionEvent
import dev.nx.console.graph.getNxGraphService
import dev.nx.console.models.NxError
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxWorkspaceRefreshStartedListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.NxHelpCommandService
import dev.nx.console.run.NxTaskExecutionManager
import dev.nx.console.run.actions.NxConnectService
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.*
import java.awt.BorderLayout
import java.awt.Color
import java.nio.file.Paths
import java.util.regex.Matcher
import javax.swing.JPanel
import javax.swing.JProgressBar
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.*
import ru.nsk.kstatemachine.event.DataEvent
import ru.nsk.kstatemachine.event.Event
import ru.nsk.kstatemachine.state.*
import ru.nsk.kstatemachine.statemachine.createStateMachineBlocking
import ru.nsk.kstatemachine.statemachine.onTransitionTriggered
import ru.nsk.kstatemachine.statemachine.processEventByLaunch
import ru.nsk.kstatemachine.statemachine.stop
import ru.nsk.kstatemachine.transition.onTriggered

object States {
    const val Loading = "Loading"
    const val ShowingPDV = "ShowingPDV"
    const val ShowingError = "ShowingError"
    const val ShowingErrorNoGraph = "ShowingErrorNoGraph"
    const val ShowingPDVLoading = "ShowingPDVLoading"
    const val ShowingErrorLoading = "ShowingErrorLoading"
}

class LoadSuccessData(val graphBasePath: String, val pdvData: String)

class LoadErrorData(
    val graphBasePath: String,
    val errorsSerialized: String,
    val errorMessage: String,
)

sealed interface Events {
    class RefreshStarted : Event

    class Refresh : Event

    class LoadSuccess(override val data: LoadSuccessData) : DataEvent<LoadSuccessData>

    class LoadError(override val data: LoadErrorData) : DataEvent<LoadErrorData>

    class LoadErrorNoGraph(override val data: String) : DataEvent<String>
}

class NewProjectDetailsBrowser(private val project: Project, private val file: VirtualFile) :
    Disposable {
    private val panel: JPanel = JPanel(BorderLayout())
    private val progressBar: JProgressBar = JProgressBar()

    private val browser: JBCefBrowser = JBCefBrowser()
    private val interactionEventQuery: JBCefJSQuery = createInteractionEventQuery()

    private val scope: CoroutineScope = ProjectLevelCoroutineHolderService.getInstance(project).cs

    private val stateMachine =
        createStateMachineBlocking(scope) {
            val loadingState = initialState(States.Loading)
            val showingPDVState =
                dataState<LoadSuccessData>(States.ShowingPDV) { onEntry { showPDV(data) } }

            val showingErrorState =
                dataState<LoadErrorData>(States.ShowingError) { onEntry { showError(data) } }

            val showingErrorNoGraphState =
                dataState<String>(States.ShowingErrorNoGraph) { onEntry { showErrorNoGraph(data) } }

            onTransitionTriggered {
                if (it.event !is Events.RefreshStarted) {
                    hideProgressBarLoading()
                }
            }

            showingPDVState.apply {
                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                    targetState = showingPDVState
                }
                dataTransition<Events.LoadError, LoadErrorData> { targetState = showingErrorState }
                dataTransition<Events.LoadErrorNoGraph, String> {
                    targetState = showingErrorNoGraphState
                }
                transition<Events.RefreshStarted> { onTriggered { showProgressBarLoading() } }
            }

            showingErrorState.apply {
                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                    targetState = showingPDVState
                }
                dataTransition<Events.LoadError, LoadErrorData> { targetState = showingErrorState }
                dataTransition<Events.LoadErrorNoGraph, String> {
                    targetState = showingErrorNoGraphState
                }
                transition<Events.RefreshStarted> { onTriggered { showProgressBarLoading() } }
            }

            showingErrorNoGraphState.apply {
                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                    targetState = showingPDVState
                }
                dataTransition<Events.LoadError, LoadErrorData> { targetState = showingErrorState }
                dataTransition<Events.LoadErrorNoGraph, String> {
                    targetState = showingErrorNoGraphState
                }
                transition<Events.RefreshStarted> { onTriggered { showProgressBarLoading() } }
            }

            loadingState.apply {
                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                    targetState = showingPDVState
                }
                dataTransition<Events.LoadError, LoadErrorData> { targetState = showingErrorState }
                dataTransition<Events.LoadErrorNoGraph, String> {
                    targetState = showingErrorNoGraphState
                }
                transition<Events.RefreshStarted> { onTriggered { showProgressBarLoading() } }

                onEntry {
                    hideProgressBarLoading()
                    showLoading()
                    tryLoadPDV()
                }
            }
        }

    init {
        progressBar.setUI(
            object : DarculaProgressBarUI() {
                override fun getRemainderColor(): Color {
                    return UIUtil.getPanelBackground()
                }
            }
        )

        panel.add(progressBar, BorderLayout.NORTH)
        panel.add(browser.component, BorderLayout.CENTER)

        with(project.messageBus.connect(this)) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener {
                    if (project.isDisposed) {
                        return@NxWorkspaceRefreshListener
                    }
                    tryLoadPDV()
                },
            )
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_STARTED_TOPIC,
                NxWorkspaceRefreshStartedListener {
                    stateMachine.processEventByLaunch(Events.RefreshStarted())
                },
            )
        }
    }

    val component = panel

    private fun tryLoadPDV() {
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val nxPackagePath = getNxPackagePath(project, project.nxBasePath)
            val graphBasePath = Paths.get(nxPackagePath, "src", "core", "graph").toString() + "/"

            val graphPathExists =
                LocalFileSystem.getInstance().findFileByPath(graphBasePath) != null

            if (!graphPathExists) {
                stateMachine.processEventByLaunch(Events.LoadErrorNoGraph("Graph not found"))
                return@launch
            }

            val pdvData = loadPDVDataSerialized()

            if (pdvData.second == null) {
                stateMachine.processEventByLaunch(
                    Events.LoadSuccess(LoadSuccessData(graphBasePath, pdvData.first))
                )
            } else {
                stateMachine.processEventByLaunch(
                    Events.LoadError(LoadErrorData(graphBasePath, pdvData.first, pdvData.second!!))
                )
            }
        }
    }

    private fun showPDV(data: LoadSuccessData) {
        val html =
            """
    <html>
    <head>
    <base href="${Matcher.quoteReplacement(data.graphBasePath)}">
    <script src="environment.js"></script>
  <link rel="stylesheet" href="styles.css">

    </head>
    <body>
        <script>
            window.__NX_RENDER_GRAPH__ = false;
        </script>
        <div style="padding: 0.5rem 0.5rem 0.5rem 0.5rem" id="app"></div>

        <script src="runtime.js"></script>
        <script src="styles.js"></script>
        <script src="main.js"></script>

        <script>
          const data = ${data.pdvData}

          const sendMessage = (message) => {
             ${interactionEventQuery.inject("JSON.stringify(message)")}
          }
          window.renderPDV({
            project: data.project,
            sourceMap: data.sourceMap,
            onViewInProjectGraph: (data) => sendMessage({ type: 'open-project-graph', payload: data }),
            errors: data.errors
            }
          )
        </script>

    </body>
    </html>
       """
                .trimIndent()

        ApplicationManager.getApplication().invokeLater { browser.loadHTML(html) }
    }

    private fun showError(data: LoadErrorData) {
        val html =
            """
    <html>
    <head>
    <base href="${Matcher.quoteReplacement(data.graphBasePath)}">
    <script src="environment.js"></script>
  <link rel="stylesheet" href="styles.css">

    </head>
    <body>
        <script>
            window.__NX_RENDER_GRAPH__ = false;
        </script>
        <div style="padding: 0.5rem 0.5rem 0.5rem 0.5rem" id="app"></div>

        <script src="runtime.js"></script>
        <script src="styles.js"></script>
        <script src="main.js"></script>

        <script>
          const data = ${data.errorsSerialized}

          const sendMessage = (message) => {
             ${interactionEventQuery.inject("JSON.stringify(message)")}
          }
          window.renderError({
            message: "${data.errorMessage}",
            errors: data.errors
            }
          )
        </script>

    </body>
    </html>
       """
                .trimIndent()

        ApplicationManager.getApplication().invokeLater { browser.loadHTML(html) }
    }

    private fun showErrorNoGraph(data: String) {
        val html =
            """
            <html>
            <body>
            ERROR: $data
            </body>
            </html>
        """
                .trimIndent()

        ApplicationManager.getApplication().invokeLater { browser.loadHTML(html) }
    }

    private fun showLoading() {
        val html =
            """
            <html>
            <body>
            LOADING
            </body>
            </html>
        """
                .trimIndent()

        ApplicationManager.getApplication().invokeLater { browser.loadHTML(html) }
    }

    private fun showProgressBarLoading() {
        ApplicationManager.getApplication().invokeLater { progressBar.isIndeterminate = true }
    }

    private fun hideProgressBarLoading() {
        ApplicationManager.getApplication().invokeLater { progressBar.isIndeterminate = false }
    }

    // right now this is: Pair<Serialized Data, Optional Error Message>
    private suspend fun loadPDVDataSerialized(): Pair<String, String?> {
        val nxlsService = NxlsService.getInstance(project)

        val workspace = nxlsService.workspace()
        val workspaceString = nxlsService.workspaceSerialized()

        if (workspace == null || workspaceString == null) {
            return Pair(
                buildJsonObject { putJsonArray("errors") {} }.toString(),
                "Workspace not found",
            )
        }

        val project = nxlsService.projectByPath(file.path)

        val errorsJson = buildJsonArray {
            workspace.errors?.forEach { error ->
                add(Json.encodeToJsonElement(NxError.serializer(), error))
            }
        }

        if (project == null) {
            return Pair(
                buildJsonObject { put("errors", errorsJson) }.toString(),
                "Couldn't find project at ${file.path}",
            )
        }

        val workspaceJson = Json.parseToJsonElement(workspaceString)
        val projectElement =
            workspaceJson.jsonObject["workspace"]
                ?.jsonObject
                ?.get("projects")
                ?.jsonObject
                ?.get(project.name)

        val sourceMapsElement =
            workspaceJson.jsonObject["workspace"]
                ?.jsonObject
                ?.get("sourceMaps")
                ?.jsonObject
                ?.get(project.root) ?: JsonNull

        return Pair(
            buildJsonObject {
                    putJsonObject("project") {
                        put("name", project.name)
                        put(
                            "type",
                            project.projectType.let {
                                when (it) {
                                    "application" -> "app"
                                    "library" -> "lib"
                                    else -> "e2e"
                                }
                            },
                        )
                        put("data", projectElement ?: buildJsonObject {})
                    }

                    put("sourceMap", sourceMapsElement)
                    put("errors", errorsJson)
                }
                .toString(),
            null,
        )
    }

    private fun createInteractionEventQuery(): JBCefJSQuery {
        val query = JBCefJSQuery.create(browser as JBCefBrowserBase)

        query.addHandler { msg ->
            try {
                val messageParsed = Json.decodeFromString<NxGraphInteractionEvent>(msg)

                when (messageParsed.type) {
                    "file-click" -> {
                        messageParsed.payload?.url?.also {
                            val fullPath = Paths.get(project.nxBasePath, it).toString()
                            LocalFileSystem.getInstance().findFileByPath(fullPath).also {
                                clickedFile ->
                                if (clickedFile == null) {
                                    Notifier.notifyAnything(
                                        project,
                                        "Couldn't find file at path $fullPath",
                                        NotificationType.ERROR,
                                    )
                                } else {
                                    val fileEditorManager = FileEditorManager.getInstance(project)
                                    ApplicationManager.getApplication().invokeLater {
                                        fileEditorManager.openFile(clickedFile, true)
                                    }
                                }
                            }
                        }
                    }
                    "open-project-config" -> {
                        scope.launch {
                            TelemetryService.getInstance(project)
                                .featureUsed(
                                    TelemetryEvent.MISC_SHOW_PROJECT_CONFIGURATION,
                                    mapOf("source" to TelemetryEventSource.GRAPH_INTERACTION),
                                )

                            messageParsed.payload?.projectName?.also {
                                project.nxWorkspace()?.workspace?.projects?.get(it)?.apply {
                                    val path =
                                        nxProjectConfigurationPath(project, root) ?: return@apply
                                    val file =
                                        LocalFileSystem.getInstance().findFileByPath(path)
                                            ?: return@apply
                                    ApplicationManager.getApplication().invokeLater {
                                        FileEditorManager.getInstance(project).openFile(file, true)
                                    }
                                }
                            }
                        }
                    }
                    "run-task" -> {
                        messageParsed.payload?.taskId?.also {
                            val (projectName, targetName) = it.split(":")
                            NxTaskExecutionManager.getInstance(project)
                                .execute(projectName, targetName)
                        }
                    }
                    "run-help" -> {
                        messageParsed.payload?.let { (projectName, _, _, _, _, helpCommand, helpCwd)
                            ->
                            if (projectName != null && helpCommand != null) {
                                NxHelpCommandService.getInstance(project)
                                    .execute(projectName, helpCommand, helpCwd)
                            }
                        }
                    }
                    "nx-connect" -> {
                        NxConnectService.getInstance(project).connectToCloud()
                    }
                    "open-project-graph" -> {
                        messageParsed.payload?.projectName?.also {
                            scope.launch {
                                val nxGraphService = getNxGraphService(project) ?: return@launch
                                withContext(Dispatchers.EDT) { nxGraphService.focusProject(it) }
                            }
                        }
                    }
                    "open-task-graph" -> {
                        messageParsed.payload?.projectName?.also { projectName ->
                            messageParsed.payload.targetName?.also { targetName ->
                                scope.launch {
                                    val nxGraphService = getNxGraphService(project) ?: return@launch
                                    ApplicationManager.getApplication().invokeLater {
                                        nxGraphService.focusTask(projectName, targetName)
                                    }
                                }
                            }
                        }
                    }
                    else -> {
                        logger<OldProjectDetailsBrowser>()
                            .warn("Unhandled graph interaction event: $messageParsed")
                    }
                }
            } catch (e: SerializationException) {
                logger<OldProjectDetailsBrowser>()
                    .error("Error parsing graph interaction event: ${e.message}")
            }
            null
        }

        return query
    }

    override fun dispose() {
        scope.launch { stateMachine.stop() }
        Disposer.dispose(browser)
    }
}
