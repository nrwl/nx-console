package dev.nx.console.project_details.browsers

import com.intellij.ide.ui.UISettingsListener
import com.intellij.ide.ui.laf.darcula.ui.DarculaProgressBarUI
import com.intellij.notification.NotificationType
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.ComboBox
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.JBColor
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBLoadingPanel
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefClient
import com.intellij.ui.jcef.JBCefJSQuery
import com.intellij.util.messages.SimpleMessageBusConnection
import com.intellij.util.ui.UIUtil
import dev.nx.console.graph.NxGraphInteractionEvent
import dev.nx.console.graph.getNxGraphService
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
import dev.nx.console.utils.jcef.awaitLoad
import dev.nx.console.utils.jcef.getHexColor
import java.awt.BorderLayout
import java.awt.Color
import java.awt.FlowLayout
import java.awt.event.ItemEvent
import java.awt.event.ItemListener
import java.nio.file.Paths
import java.util.regex.Matcher
import javax.swing.JPanel
import javax.swing.JProgressBar
import kotlinx.coroutines.*
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.*
import ru.nsk.kstatemachine.event.DataEvent
import ru.nsk.kstatemachine.event.Event
import ru.nsk.kstatemachine.state.*
import ru.nsk.kstatemachine.statemachine.*
import ru.nsk.kstatemachine.transition.onTriggered
import ru.nsk.kstatemachine.visitors.export.exportToPlantUml

object States {
    const val InitialLoading = "InitialLoading"
    const val ShowingPDV = "ShowingPDV"
    const val ShowingPDVMulti = "ShowingPDVMulti"
    const val ShowingError = "ShowingError"
    const val ShowingErrorNoGraph = "ShowingErrorNoGraph"
    const val Loading = "Loading"
}

class LoadSuccessData(val graphBasePath: String, val pdvData: String)

class LoadSuccessMultiData(val graphBasePath: String, val pdvData: Map<String, String>)

class LoadErrorData(
    val graphBasePath: String,
    val errorsSerialized: String,
    val errorMessage: String,
)

sealed interface Events {
    class RefreshStarted : Event

    class TryLoadPDV : Event

    class ChangeUISettings : Event

    class SelectMultiProject(override val data: String) : DataEvent<String>

    class LoadSuccess(override val data: LoadSuccessData) : DataEvent<LoadSuccessData>

    class LoadSuccessMulti(override val data: LoadSuccessMultiData) :
        DataEvent<LoadSuccessMultiData>

    class LoadError(override val data: LoadErrorData) : DataEvent<LoadErrorData>

    class LoadErrorNoGraph(override val data: String) : DataEvent<String>
}

class NewProjectDetailsBrowser(private val project: Project, private val file: VirtualFile) :
    Disposable {
    private val loadingPanel: JBLoadingPanel = JBLoadingPanel(BorderLayout(), this)
    private val progressBar: JProgressBar = JProgressBar()
    private val multiDisclaimerPanel: JPanel
    private val projectsComboBox: ComboBox<String> = ComboBox<String>()

    private val browser: JBCefBrowser = JBCefBrowser()
    private val interactionEventQuery: JBCefJSQuery

    private lateinit var stateMachine: StateMachine
    private lateinit var messageBusConnection: SimpleMessageBusConnection

    private val scope: CoroutineScope = ProjectLevelCoroutineHolderService.getInstance(project).cs

    init {
        progressBar.setUI(
            object : DarculaProgressBarUI() {
                override fun getRemainderColor(): Color {
                    return UIUtil.getPanelBackground()
                }
            }
        )

        multiDisclaimerPanel =
            JPanel().apply {
                layout = FlowLayout(FlowLayout.LEFT, 5, 5)
                add(JBLabel("Select project"), BorderLayout.NORTH)
                add(projectsComboBox, BorderLayout.CENTER)
                isVisible = false
            }

        loadingPanel.add(progressBar, BorderLayout.NORTH)
        loadingPanel.add(multiDisclaimerPanel, BorderLayout.NORTH)
        loadingPanel.add(browser.component, BorderLayout.CENTER)

        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 100)
        interactionEventQuery = createInteractionEventQuery()

        init()
    }

    val component = loadingPanel

    private fun init() {
        scope.launch {
            stateMachine =
                createStateMachine(scope) {
                    onTransitionComplete { activeStates, transitionParams ->
                        logger<NewProjectDetailsBrowser>()
                            .debug("Transition ${transitionParams.transition} State $activeStates")
                    }
                    val initialLoadingState =
                        initialState(States.InitialLoading) {
                            onEntry {
                                hideMultiDisclaimer()
                                hideProgressBarLoading()
                                loadingPanel.startLoading()
                                this@createStateMachine.processEvent(Events.TryLoadPDV())
                            }
                            onExit { loadingPanel.stopLoading() }
                        }
                    val showingPDVState =
                        dataState<LoadSuccessData>(States.ShowingPDV) {
                            onEntry {
                                hideMultiDisclaimer()
                                showPDV(data.graphBasePath, data.pdvData)
                                setColors()
                            }
                        }

                    val showingPDVMultiState =
                        dataState<LoadSuccessMultiData>(States.ShowingPDVMulti) {
                            onEntry {
                                val projects = data.pdvData.keys.toTypedArray()
                                val selectedProject = "ng-org2-app16530648"
                                projectsComboBox.removeAllItems()
                                projects.forEach { projectsComboBox.addItem(it) }
                                showMultiDisclaimer(projects)
                                showPDV(data.graphBasePath, data.pdvData[selectedProject]!!)
                                setColors()
                            }
                        }

                    val showingErrorState =
                        dataState<LoadErrorData>(States.ShowingError) {
                            onEntry {
                                hideMultiDisclaimer()
                                showError(data)
                                setColors()
                            }
                        }

                    val showingErrorNoGraphState =
                        dataState<String>(States.ShowingErrorNoGraph) {
                            onEntry {
                                hideMultiDisclaimer()
                                showErrorNoGraph(data)
                            }
                        }

                    val loadingState =
                        state(States.Loading).apply {
                            onEntry { showProgressBarLoading() }
                            onExit { hideProgressBarLoading() }
                        }

                    listOf(
                            showingPDVState,
                            showingErrorState,
                            showingErrorNoGraphState,
                            initialLoadingState,
                            loadingState,
                            showingPDVMultiState,
                        )
                        .forEach {
                            it.apply {
                                transition<Events.TryLoadPDV> {
                                    targetState = loadingState
                                    onTriggered {
                                        if (browser.isDisposed) {
                                            return@onTriggered
                                        }
                                        val nxlsService = NxlsService.getInstance(project)
                                        nxlsService.awaitStarted()
                                        val pdvData = nxlsService.pdvData(file.path)

                                        if (
                                            pdvData == null ||
                                                pdvData.resultType === "NO_GRAPH_ERROR" ||
                                                pdvData.graphBasePath == null
                                        ) {
                                            this@createStateMachine.processEvent(
                                                Events.LoadErrorNoGraph("Graph not found")
                                            )
                                            return@onTriggered
                                        }

                                        if (pdvData.resultType == "ERROR") {
                                            this@createStateMachine.processEvent(
                                                Events.LoadError(
                                                    LoadErrorData(
                                                        pdvData.graphBasePath,
                                                        pdvData.errorsSerialized ?: "",
                                                        pdvData.errorMessage ?: "",
                                                    )
                                                )
                                            )
                                        }

                                        if (pdvData.resultType == "SUCCESS_MULTI") {
                                            if (pdvData.pdvDataSerializedMulti != null) {
                                                this@createStateMachine.processEvent(
                                                    Events.LoadSuccessMulti(
                                                        LoadSuccessMultiData(
                                                            pdvData.graphBasePath,
                                                            pdvData.pdvDataSerializedMulti,
                                                        )
                                                    )
                                                )
                                            } else {
                                                if (pdvData.pdvDataSerialized != null) {
                                                    this@createStateMachine.processEvent(
                                                        Events.LoadSuccess(
                                                            LoadSuccessData(
                                                                pdvData.graphBasePath,
                                                                pdvData.pdvDataSerialized,
                                                            )
                                                        )
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                                dataTransition<Events.LoadSuccess, LoadSuccessData> {
                                    targetState = showingPDVState
                                }
                                dataTransition<Events.LoadSuccessMulti, LoadSuccessMultiData> {
                                    targetState = showingPDVMultiState
                                }
                                dataTransition<Events.LoadError, LoadErrorData> {
                                    targetState = showingErrorState
                                }
                                dataTransition<Events.LoadErrorNoGraph, String> {
                                    targetState = showingErrorNoGraphState
                                }
                                transition<Events.RefreshStarted> { targetState = loadingState }
                                transition<Events.ChangeUISettings> { onTriggered { setColors() } }
                            }
                        }
                }

            messageBusConnection = project.messageBus.connect(scope)
            with(messageBusConnection) {
                subscribe(
                    NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                    NxWorkspaceRefreshListener {
                        if (project.isDisposed) {
                            return@NxWorkspaceRefreshListener
                        }
                        stateMachine.processEventByLaunch(Events.TryLoadPDV())
                    },
                )
                subscribe(
                    NxlsService.NX_WORKSPACE_REFRESH_STARTED_TOPIC,
                    NxWorkspaceRefreshStartedListener {
                        stateMachine.processEventByLaunch(Events.RefreshStarted())
                    },
                )
                subscribe(
                    UISettingsListener.TOPIC,
                    UISettingsListener {
                        stateMachine.processEventByLaunch(Events.ChangeUISettings())
                    },
                )
            }

            val itemListener = ItemListener { e ->
                if (e != null && e.stateChange == ItemEvent.SELECTED) {
                    stateMachine.processEventByLaunch(Events.SelectMultiProject(e.item as String))
                }
            }

            projectsComboBox.addItemListener(itemListener)

            Disposer.register(this@NewProjectDetailsBrowser) {
                projectsComboBox.removeItemListener(itemListener)
            }

            val plantUML = stateMachine.exportToPlantUml()
            logger<NewProjectDetailsBrowser>().debug(plantUML)
        }
    }

    private suspend fun showPDV(graphBasePath: String, pdvData: String) {
        val html =
            """
    <html>
    <head>
    <base href="${Matcher.quoteReplacement(graphBasePath)}${if(graphBasePath.endsWith("/")) "" else "/"}">
    <script src="environment.js"></script>
    <link rel="stylesheet" href="styles.css">
    <style>
        body {
            background-color: ${getHexColor(UIUtil.getPanelBackground())} !important;
            font-family: '${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans','Helvetica Neue', sans-serif;
            font-size: ${UIUtil.getLabelFont().size}px;
             color: ${
                        getHexColor(
                            when (!JBColor.isBright()) {
                                true -> UIUtil.getActiveTextColor()
                                false -> UIUtil.getLabelForeground()
                            }
                        )
        }
    </style>

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
          const data = ${pdvData}

          const sendMessage = (message) => {
             ${interactionEventQuery.inject("JSON.stringify(message)")}
          }
          window.renderPDV({
           ...data,
            onViewInProjectGraph: (data) => sendMessage({ type: 'open-project-graph', payload: data }),
            }
          )
        </script>

    </body>
    </html>
       """
                .trimIndent()

        withContext(Dispatchers.EDT) {
            browser.loadHTML(html)
            browser.awaitLoad()
        }
    }

    private suspend fun showError(data: LoadErrorData) {
        val html =
            """
    <html>
    <head>
    <base href="${Matcher.quoteReplacement(data.graphBasePath)}${if(data.graphBasePath.endsWith("/")) "" else "/"}">
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
          window.renderError({
            message: "${data.errorMessage}",
            errors: ${data.errorsSerialized}
            }
          )
        </script>

    </body>
    </html>
       """
                .trimIndent()

        withContext(Dispatchers.EDT) {
            browser.loadHTML(html)
            browser.awaitLoad()
        }
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

    private fun showProgressBarLoading() {
        ApplicationManager.getApplication().invokeLater { progressBar.isIndeterminate = true }
    }

    private fun hideProgressBarLoading() {
        ApplicationManager.getApplication().invokeLater { progressBar.isIndeterminate = false }
    }

    private fun showMultiDisclaimer(projects: Array<String>) {
        multiDisclaimerPanel.toolTipText = projects.joinToString(" ")
        multiDisclaimerPanel.isVisible = true
    }

    private fun hideMultiDisclaimer() {
        multiDisclaimerPanel.isVisible = false
    }

    private suspend fun setColors() {
        val backgroundColor = getHexColor(UIUtil.getPanelBackground())
        if (browser.isDisposed) return
        browser.executeJavascriptWithCatch(
            """
                const isDark = ${!JBColor.isBright()};
              const body = document.body;
              if(!body) return;

              const darkClass = 'vscode-dark';
              const lightClass = 'vscode-light';

              body.classList?.remove(darkClass, lightClass);

              if (isDark) {
                  body.classList?.add(darkClass);
              } else {
                  body.classList?.add(lightClass);
              }
              console.log("$backgroundColor")
              body.style?.setProperty('background-color', '$backgroundColor', 'important');
                """
                .trimIndent()
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
        if (::stateMachine.isInitialized) {
            scope.launch { stateMachine.stop() }
        }
        if (::messageBusConnection.isInitialized) {
            messageBusConnection.disconnect()
        }
        Disposer.dispose(interactionEventQuery)
        Disposer.dispose(browser)
    }
}
