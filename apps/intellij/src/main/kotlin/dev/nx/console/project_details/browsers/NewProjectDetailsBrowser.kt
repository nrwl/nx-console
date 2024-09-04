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
import ru.nsk.kstatemachine.statemachine.processEventByLaunch
import ru.nsk.kstatemachine.statemachine.stop

object States {
    const val Loading = "Loading"
    const val ShowingPDV = "ShowingPDV"
    const val ShowingError = "ShowingError"
    const val ShowingPDVLoading = "ShowingPDVLoading"
    const val ShowingErrorLoading = "ShowingErrorLoading"
}

class LoadSuccessData(val graphBasePath: String, val pdvData: String)

sealed interface Events {
    class RefreshStarted : Event

    class LoadSuccess(override val data: LoadSuccessData) : DataEvent<LoadSuccessData>

    class LoadError(override val data: String) : DataEvent<String>
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
            val showingPDVState = dataState(States.ShowingPDV) { onEntry { showPDV(data) } }

            val showingErrorState = dataState(States.ShowingError) { onEntry { showError(data) } }

            val showingPDVLoadingState =
                state(States.ShowingPDVLoading) {
                    onEntry { showProgressBarLoading() }
                    onExit { hideProgressBarLoading() }
                }

            val showingErrorLoadingState =
                state(States.ShowingErrorLoading) {
                    onEntry { showProgressBarLoading() }
                    onExit { hideProgressBarLoading() }
                }

            showingPDVState.apply {
                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                    targetState = showingPDVState
                }
                dataTransition<Events.LoadError, String> { targetState = showingErrorState }
                transition<Events.RefreshStarted> { targetState = showingPDVLoadingState }
            }

            showingErrorState.apply {
                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                    targetState = showingPDVState
                }
                dataTransition<Events.LoadError, String> { targetState = showingErrorState }
                transition<Events.RefreshStarted> { targetState = showingPDVLoadingState }
            }

            showingPDVLoadingState.apply {
                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                    targetState = showingPDVState
                }
                dataTransition<Events.LoadError, String> { targetState = showingErrorState }
            }

            showingErrorLoadingState.apply {
                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                    targetState = showingPDVState
                }
                dataTransition<Events.LoadError, String> { targetState = showingErrorState }
            }

            loadingState.apply {
                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                    targetState = showingPDVState
                }
                dataTransition<Events.LoadError, String> { targetState = showingErrorState }
                transition<Events.RefreshStarted> { targetState = loadingState }

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
        <div style="padding: 0.5rem 0.5rem 0.5rem 0.5rem" id="root"></div>

    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>


    <script src="runtime.js"></script>
    <script src="styles.js"></script>
    <script src="pdv.umd.js"></script>

      <script>
      const data = ${data.pdvData}

      const sendMessage = (message) => {
         ${interactionEventQuery.inject("JSON.stringify(message)")}
      }

      const root = ReactDOM.createRoot(document.getElementById('root'));

      const pdvelement = React.createElement(PDV.default, {
        project: data.project,
        sourceMap: data.sourceMap,
        onViewInProjectGraph: (data) => sendMessage({ type: 'open-project-graph', payload: data }),
        }
      )
      root.render(React.createElement(PDV.ExpandedTargetsProvider, null, pdvelement));

    </script>

    </body>
    </html>
       """
                .trimIndent()

        ApplicationManager.getApplication().invokeLater { browser.loadHTML(html) }
    }

    private fun showError(data: String) {
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

    private fun tryLoadPDV() {
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val nxPackagePath = getNxPackagePath(project, project.nxBasePath)
            val graphBasePath =
                try {
                    Paths.get(nxPackagePath, "src", "core", "graph").toString() + "/"
                } catch (e: Throwable) {
                    null
                }

            val pdvData = loadPDVDataSerialized()

            if (graphBasePath != null && pdvData.second) {
                stateMachine.processEventByLaunch(
                    Events.LoadSuccess(LoadSuccessData(graphBasePath, pdvData.first))
                )
            } else {
                stateMachine.processEventByLaunch(Events.LoadError(pdvData.first))
            }
        }
    }

    private suspend fun loadPDVDataSerialized(): Pair<String, Boolean> {
        val nxlsService = NxlsService.getInstance(project)

        val workspace = nxlsService.workspace()
        val workspaceString = nxlsService.workspaceSerialized()

        if (workspace == null || workspaceString == null) {
            return Pair(
                buildJsonObject {
                        putJsonArray("errors") {
                            add(buildJsonObject { put("message", "Workspace not found") })
                        }
                    }
                    .toString(),
                false,
            )
        }

        val project = nxlsService.projectByPath(file.path)

        val errorsJson = buildJsonArray {
            workspace.errors?.forEach { error ->
                add(Json.encodeToJsonElement(NxError.serializer(), error))
            }
        }

        if (project == null) {
            return Pair(buildJsonObject { put("errors", errorsJson) }.toString(), false)
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
                ?.get(project.root)
                ?: JsonNull

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
            true,
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
