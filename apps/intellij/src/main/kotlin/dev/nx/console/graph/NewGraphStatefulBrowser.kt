package dev.nx.console.graph

import com.intellij.ide.ui.UISettingsListener
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.ComboBox
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.ui.JBColor
import com.intellij.ui.components.JBLoadingPanel
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefClient
import com.intellij.ui.jcef.JBCefJSQuery
import com.intellij.util.messages.SimpleMessageBusConnection
import com.intellij.util.ui.UIUtil
import dev.nx.console.graph.NxGraphInteractionEvent
import dev.nx.console.graph.getNxGraphService
import dev.nx.console.models.NxGraphDataResult
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxWorkspaceRefreshStartedListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.NxHelpCommandService
import dev.nx.console.run.NxTaskExecutionManager
import dev.nx.console.run.actions.NxConnectService
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.executeJavascriptWithCatch
import dev.nx.console.utils.getNxPackagePath
import dev.nx.console.utils.nxBasePath
import dev.nx.console.utils.nxProjectConfigurationPath
import dev.nx.console.utils.jcef.awaitLoad
import dev.nx.console.utils.jcef.getHexColor
import java.awt.BorderLayout
import java.awt.Color
import java.nio.file.Paths
import java.util.regex.Matcher
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JProgressBar
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import ru.nsk.kstatemachine.event.DataEvent
import ru.nsk.kstatemachine.event.Event
import ru.nsk.kstatemachine.state.DefaultDataState
import ru.nsk.kstatemachine.state.State
import ru.nsk.kstatemachine.state.dataState
import ru.nsk.kstatemachine.state.initialState
import ru.nsk.kstatemachine.state.state
import ru.nsk.kstatemachine.statemachine.StateMachine
import ru.nsk.kstatemachine.statemachine.createStateMachine
import ru.nsk.kstatemachine.transition.TransitionType
import ru.nsk.kstatemachine.transition.onTriggered
import ru.nsk.kstatemachine.transition.targetState

object GraphStates {
    const val InitialLoading = "InitialLoading"
    const val ShowingGraph = "ShowingGraph"
    const val ShowingError = "ShowingError"
    const val Loading = "Loading"
}

data class LoadGraphSuccessData(val graphBasePath: String, val graphDataSerialized: String)

data class LoadGraphErrorData(
    val graphBasePath: String?,
    val errorsSerialized: String?,
    val errorMessage: String?,
)

sealed interface GraphEvents {
    class RefreshStarted : Event

    class TryLoadGraph : Event

    class ChangeUISettings : Event

    class LoadSuccess(override val data: LoadGraphSuccessData) : DataEvent<LoadGraphSuccessData>

    class LoadError(override val data: LoadGraphErrorData) : DataEvent<LoadGraphErrorData>
}

class NewGraphStatefulBrowser(private val project: Project) : Disposable {

    private val rootPanel = JPanel(BorderLayout())
    private val loadingPanel = JBLoadingPanel(BorderLayout(), this)
    private val progressBar = JProgressBar()

    private val browser: JBCefBrowser = JBCefBrowser()
    private val interactionEventQuery: JBCefJSQuery

    private lateinit var stateMachine: StateMachine
    private lateinit var messageBusConnection: SimpleMessageBusConnection

    private val scope: CoroutineScope = ProjectLevelCoroutineHolderService.getInstance(project).cs

    init {
        progressBar.isIndeterminate = false
        loadingPanel.add(progressBar, BorderLayout.NORTH)
        loadingPanel.add(browser.component, BorderLayout.CENTER)
        rootPanel.add(loadingPanel, BorderLayout.CENTER)

        browser.setOpenLinksInExternalBrowser(true)
        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 100)
        interactionEventQuery = createInteractionEventQuery()

        init()
    }

    val component: JComponent = rootPanel

    private fun init() {
        scope.launch {
            stateMachine =
                createStateMachine(scope, start = false) {
                    onTransitionComplete { activeStates, transitionParams ->
                        logger<NewGraphStatefulBrowser>()
                            .debug("Event ${transitionParams.event::class.simpleName} State $activeStates")
                    }

                    val initialLoadingState =
                        initialState(GraphStates.InitialLoading) {
                            onEntry {
                                renderLoading()
                                this@createStateMachine.processEvent(GraphEvents.TryLoadGraph())
                            }
                            onExit { stopLoading() }
                            transition<GraphEvents.TryLoadGraph> {
                                onTriggered { tryLoadGraph(this@createStateMachine) }
                            }
                            transition<GraphEvents.ChangeUISettings> { onTriggered { setColors() } }
                        }

                    val showingGraphState =
                        dataState<LoadGraphSuccessData>(GraphStates.ShowingGraph) {
                            onEntry {
                                stopLoading()
                                if (it.transition.sourceState == this@dataState) {
                                    updateGraph(data.graphDataSerialized)
                                } else {
                                    renderGraph(data.graphBasePath, data.graphDataSerialized)
                                    setColors()
                                }
                            }
                            dataTransition<GraphEvents.LoadSuccess, LoadGraphSuccessData> {
                                // refresh and update in-place
                                type = TransitionType.EXTERNAL
                                targetState = this@dataState
                            }
                            transition<GraphEvents.TryLoadGraph> {
                                onTriggered { tryLoadGraph(this@createStateMachine) }
                            }
                            transition<GraphEvents.RefreshStarted> {
                                onTriggered { startLoading() }
                            }
                            transition<GraphEvents.ChangeUISettings> { onTriggered { setColors() } }
                        }

                    val showingErrorState =
                        dataState<LoadGraphErrorData>(GraphStates.ShowingError) {
                            onEntry {
                                stopLoading()
                                renderError(data)
                                setColors()
                            }
                            transition<GraphEvents.TryLoadGraph> {
                                onTriggered { tryLoadGraph(this@createStateMachine) }
                            }
                            transition<GraphEvents.RefreshStarted> { onTriggered { startLoading() } }
                            transition<GraphEvents.ChangeUISettings> { onTriggered { setColors() } }
                        }

                    val loadingState =
                        state(GraphStates.Loading).apply {
                            onEntry { startLoading() }
                            onExit { stopLoading() }
                        }

                    // from initial or loading, we go to result states
                    listOf(initialLoadingState, loadingState).apply {
                        dataTransition<GraphEvents.LoadSuccess, LoadGraphSuccessData> {
                            targetState = showingGraphState
                        }
                        dataTransition<GraphEvents.LoadError, LoadGraphErrorData> {
                            targetState = showingErrorState
                        }
                    }

                    registerListeners(this@createStateMachine)
                }
            stateMachine.start()
        }
    }

    private fun registerListeners(stateMachine: StateMachine) {
        messageBusConnection = project.messageBus.connect(scope)
        with(messageBusConnection) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener {
                    if (project.isDisposed) return@NxWorkspaceRefreshListener
                    stateMachine.processEventByLaunch(GraphEvents.TryLoadGraph())
                },
            )
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_STARTED_TOPIC,
                NxWorkspaceRefreshStartedListener {
                    stateMachine.processEventByLaunch(GraphEvents.RefreshStarted())
                },
            )
            subscribe(
                UISettingsListener.TOPIC,
                UISettingsListener { stateMachine.processEventByLaunch(GraphEvents.ChangeUISettings()) },
            )
        }
    }

    private suspend fun tryLoadGraph(stateMachine: StateMachine) {
        if (browser.isDisposed) return
        try {
            val nxlsService = NxlsService.getInstance(project)
            if (!nxlsService.isStarted()) return
            val result = nxlsService.graphData()
            if (result == null) {
                stateMachine.processEvent(GraphEvents.LoadError(LoadGraphErrorData(null, null, "Unable to load graph data")))
                return
            }
            when (result.resultType) {
                "SUCCESS" -> {
                    val basePath = result.graphBasePath
                    val data = result.graphDataSerialized
                    if (basePath != null && data != null) {
                        stateMachine.processEvent(GraphEvents.LoadSuccess(LoadGraphSuccessData(basePath, data)))
                    } else {
                        stateMachine.processEvent(GraphEvents.LoadError(LoadGraphErrorData(basePath, result.errorsSerialized, result.errorMessage)))
                    }
                }
                else -> {
                    stateMachine.processEvent(
                        GraphEvents.LoadError(
                            LoadGraphErrorData(result.graphBasePath, result.errorsSerialized, result.errorMessage)
                        )
                    )
                }
            }
        } catch (e: Throwable) {
            logger<NewGraphStatefulBrowser>().warn("Error loading graph data: ${e.message}")
            stateMachine.processEvent(GraphEvents.LoadError(LoadGraphErrorData(null, null, e.message)))
        }
    }

    private fun renderLoading() {
        ApplicationManager.getApplication().invokeLater { loadingPanel.startLoading() }
    }

    private suspend fun startLoading() {
        withContext(Dispatchers.EDT) { loadingPanel.startLoading(); progressBar.isIndeterminate = true }
    }

    private suspend fun stopLoading() {
        withContext(Dispatchers.EDT) { loadingPanel.stopLoading(); progressBar.isIndeterminate = false }
    }

    private suspend fun renderGraph(graphBasePath: String, graphDataSerialized: String) {
        if (browser.isDisposed || interactionEventQuery.isDisposed) return
        val html =
            """
            <html>
              <head>
                <base href="${Matcher.quoteReplacement(graphBasePath)}${if (graphBasePath.endsWith("/")) "" else "/"}">
                <script src="environment.js"></script>
                <link rel="stylesheet" href="styles.css">
                <style>
                  html, body, #app { height: 100%; }
                  #app { width: 100%; }
                  body {
                    background-color: ${getHexColor(UIUtil.getPanelBackground())} !important;
                    font-family: '${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans','Helvetica Neue', sans-serif;
                    font-size: ${UIUtil.getLabelFont().size}px;
                    color: ${getHexColor(if (!JBColor.isBright()) UIUtil.getActiveTextColor() else UIUtil.getLabelForeground())}
                  }
                </style>
              </head>
              <body>
                <script>
                  window.__NX_RENDER_GRAPH__ = false;
                  window.environment = "nx-console";
                </script>
                <div id="app"></div>
                <script src="runtime.js"></script>
                <script src="styles.js"></script>
                <script src="main.js"></script>
                <script>
                  const data = $graphDataSerialized;
                  window.externalApi = window.externalApi || {};
                  window.externalApi.graphInteractionEventListener = (message) => {
                    ${interactionEventQuery.inject("JSON.stringify(message)")}
                  };
                  let service = window.renderProjectGraph(data);
                  window.addEventListener('message', (event) => {
                    const message = event.data;
                    if (message && message.type === 'update-graph') {
                      service.send({
                        type: 'updateGraph',
                        ...message.data
                      });
                    }
                  });
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

    private fun updateGraph(graphDataSerialized: String) {
        if (browser.isDisposed) return
        browser.executeJavascriptWithCatch(
            """
            const __nx_data = $graphDataSerialized;
            window.postMessage({
              type: 'update-graph',
              data: {
                projects: Object.values(__nx_data.nodes || {}),
                dependencies: __nx_data.dependencies || {},
                fileMap: undefined,
              }
            }, '*');
            """
                .trimIndent()
        )
    }

    private suspend fun renderError(data: LoadGraphErrorData) {
        if (browser.isDisposed) return
        val basePath = data.graphBasePath
        if (basePath.isNullOrEmpty()) {
            // Fallback to simple error html
            val html =
                """
                <html><body>
                  <h2>Nx Console could not load the Project Graph.</h2>
                  <h4>Make sure dependencies are installed and refresh the workspace from the editor toolbar.</h4>
                  ${if (!data.errorMessage.isNullOrEmpty()) "<pre style=\"white-space:pre-wrap;\">${data.errorMessage}</pre>" else ""}
                </body></html>
                """
                    .trimIndent()
            withContext(Dispatchers.EDT) { browser.loadHTML(html); browser.awaitLoad() }
            return
        }

        val html =
            """
            <html>
              <head>
                <base href="${Matcher.quoteReplacement(basePath)}${if (basePath.endsWith("/")) "" else "/"}">
                <script src="environment.js"></script>
                <link rel="stylesheet" href="styles.css">
              </head>
              <body>
                <script>
                  window.__NX_RENDER_GRAPH__ = false;
                </script>
                <div id="app"></div>
                <script src="runtime.js"></script>
                <script src="styles.js"></script>
                <script src="main.js"></script>
                <script>
                  const service = window.renderError({
                    message: "${(data.errorMessage ?: "").replace("\"", "\\\"")}",
                    errors: ${data.errorsSerialized ?: "[]"}
                  });
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
              body.style?.setProperty('background-color', '$backgroundColor', 'important');
              body.style?.setProperty('color', '${getHexColor(if (!JBColor.isBright()) UIUtil.getActiveTextColor() else UIUtil.getLabelForeground())}', 'important');
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
                            LocalFileSystem.getInstance().findFileByPath(fullPath).also { clickedFile ->
                                if (clickedFile == null) {
                                    Notifier.notifyAnything(
                                        project,
                                        "Couldn't find file at path $fullPath",
                                        com.intellij.notification.NotificationType.ERROR,
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
                                project.nxWorkspace()?.projectGraph?.nodes?.get(it)?.apply {
                                    val path = nxProjectConfigurationPath(project, data.root) ?: return@apply
                                    val file = LocalFileSystem.getInstance().findFileByPath(path) ?: return@apply
                                    ApplicationManager.getApplication().invokeLater {
                                        FileEditorManager.getInstance(project).openFile(file, true)
                                    }
                                }
                            }
                        }
                    }
                    "run-task" -> {
                        messageParsed.payload?.taskId?.also {
                            NxTaskExecutionManager.getInstance(project).execute(it)
                        }
                    }
                    "run-help" -> {
                        messageParsed.payload?.let { (projectName, _, _, _, _, helpCommand, helpCwd) ->
                            if (projectName != null && helpCommand != null) {
                                NxHelpCommandService.getInstance(project).execute(projectName, helpCommand, helpCwd)
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
                        logger<NewGraphStatefulBrowser>().warn("Unhandled graph interaction event: $messageParsed")
                    }
                }
            } catch (e: SerializationException) {
                logger<NewGraphStatefulBrowser>().error("Error parsing graph interaction event: ${e.message}")
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
        Disposer.dispose(browser)
        Disposer.dispose(interactionEventQuery)
    }
}
