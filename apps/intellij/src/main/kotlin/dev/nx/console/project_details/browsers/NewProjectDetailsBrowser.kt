package dev.nx.console.project_details.browsers

import com.intellij.ide.ui.UISettingsListener
import com.intellij.ide.ui.laf.darcula.ui.DarculaProgressBarUI
import com.intellij.notification.NotificationType
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.observable.util.addItemListener
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.ComboBox
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.JBColor
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBLoadingPanel
import com.intellij.ui.jcef.*
import com.intellij.util.messages.SimpleMessageBusConnection
import com.intellij.util.ui.UIUtil
import dev.nx.console.graph.NxGraphInteractionEvent
import dev.nx.console.graph.getNxGraphService
import dev.nx.console.models.NxVersion
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
import ru.nsk.kstatemachine.transition.TransitionType
import ru.nsk.kstatemachine.transition.onTriggered
import ru.nsk.kstatemachine.transition.stay
import ru.nsk.kstatemachine.transition.targetState

object States {
    const val InitialLoading = "InitialLoading"
    const val ShowingPDV = "ShowingPDV"
    const val ShowingPDVMulti = "ShowingPDVMulti"
    const val ShowingError = "ShowingError"
    const val ShowingErrorNoGraph = "ShowingErrorNoGraph"
    const val ShowingOldBrowser = "ShowingOldBrowser"
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

    class SelectMultiProject : Event

    class LoadSuccess(override val data: LoadSuccessData) : DataEvent<LoadSuccessData>

    class LoadSuccessMulti(override val data: LoadSuccessMultiData) :
        DataEvent<LoadSuccessMultiData>

    class LoadError(override val data: LoadErrorData) : DataEvent<LoadErrorData>

    class LoadErrorNoGraph(data: String? = null) : DataEvent<String> {
        override val data = data ?: ""
    }

    class LoadOldBrowser : Event
}

class NewProjectDetailsBrowser(private val project: Project, private val file: VirtualFile) :
    Disposable {
    private val rootPanel = JPanel(BorderLayout())

    private val loadingPanel = JBLoadingPanel(BorderLayout(), this)
    private val progressBar = JProgressBar()
    private val multiDisclaimerPanel: JPanel
    private val projectsComboBox = ComboBox<String>()
    private val projectsComboBoxListener = ItemListener { e ->
        if (e != null && e.stateChange == ItemEvent.SELECTED) {
            if (::stateMachine.isInitialized) {
                stateMachine.processEventByLaunch(Events.SelectMultiProject())
            }
        }
    }

    private var oldBrowser: OldProjectDetailsBrowser? = null

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
                val flowLayout = FlowLayout(FlowLayout.LEFT, 5, 5)
                layout = flowLayout
                add(JBLabel("Select project"), BorderLayout.NORTH)
                add(projectsComboBox, BorderLayout.CENTER)
                isVisible = false
            }

        loadingPanel.add(
            JPanel(BorderLayout()).apply {
                add(progressBar, BorderLayout.NORTH)
                add(multiDisclaimerPanel, BorderLayout.SOUTH)
            },
            BorderLayout.NORTH,
        )

        loadingPanel.add(browser.component, BorderLayout.CENTER)

        rootPanel.add(loadingPanel, BorderLayout.CENTER)

        browser.setOpenLinksInExternalBrowser(true)
        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 100)
        interactionEventQuery = createInteractionEventQuery()

        init()
    }

    val component = rootPanel

    private fun init() {
        scope.launch {
            stateMachine =
                createStateMachine(scope, start = false) {
                    onTransitionComplete { activeStates, transitionParams ->
                        logger<NewProjectDetailsBrowser>()
                            .debug(
                                "Event ${transitionParams.event::class.simpleName} State $activeStates"
                            )
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
                            transition<Events.TryLoadPDV> {
                                onTriggered { tryLoadPDV(this@createStateMachine) }
                            }
                            transition<Events.ChangeUISettings> { onTriggered { setColors() } }
                        }

                    val showingPDVState =
                        dataState<LoadSuccessData>(States.ShowingPDV) {
                            onEntry {
                                hideProgressBarLoading()
                                hideMultiDisclaimer()

                                if (it.transition.sourceState == this@dataState) {
                                    updatePDVData(data.pdvData)
                                } else {
                                    showPDV(data.graphBasePath, data.pdvData)
                                    setColors()
                                }
                            }
                            dataTransition<Events.LoadSuccess, LoadSuccessData> {
                                // this makes sure that the data is updated & onEntry called again
                                type = TransitionType.EXTERNAL
                                targetState = this@dataState
                            }
                            transition<Events.TryLoadPDV> {
                                onTriggered { tryLoadPDV(this@createStateMachine) }
                            }
                            transition<Events.RefreshStarted> {
                                onTriggered { showProgressBarLoading() }
                            }
                            transition<Events.ChangeUISettings> { onTriggered { setColors() } }
                        }

                    val showingPDVMultiState =
                        dataState<LoadSuccessMultiData>(States.ShowingPDVMulti) {
                            onEntry {
                                hideProgressBarLoading()

                                val projects = data.pdvData.keys.toTypedArray()
                                val selectedProject = projectsComboBox.item ?: projects.first()
                                if (it.transition.sourceState == this@dataState) {
                                    updatePDVData(data.pdvData[selectedProject]!!)
                                } else {
                                    updateMultiDropdown(projects, selectedProject)
                                    showMultiDisclaimer()

                                    showPDV(data.graphBasePath, data.pdvData[selectedProject]!!)
                                    setColors()
                                }
                            }
                            dataTransition<Events.LoadSuccessMulti, LoadSuccessMultiData> {
                                // this makes sure that the data is updated & onEntry called again
                                type = TransitionType.EXTERNAL
                                targetState = this@dataState
                            }
                            transition<Events.SelectMultiProject> {
                                onTriggered {
                                    val sourceState = it.transition.sourceState
                                    if (sourceState is DefaultDataState<*>) {
                                        val lastData = sourceState.lastData
                                        if (lastData is LoadSuccessMultiData) {
                                            val projects = lastData.pdvData.keys.toTypedArray()
                                            val selectedProject =
                                                projectsComboBox.item ?: projects.first()

                                            updateMultiDropdown(projects, selectedProject)
                                            this@createStateMachine.processEvent(
                                                Events.LoadSuccessMulti(lastData)
                                            )
                                        }
                                    }
                                }
                            }
                            transition<Events.TryLoadPDV> {
                                onTriggered { tryLoadPDV(this@createStateMachine) }
                            }
                            transition<Events.RefreshStarted> {
                                onTriggered { showProgressBarLoading() }
                            }
                            transition<Events.ChangeUISettings> { onTriggered { setColors() } }
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

                    val showingOldBrowserState =
                        state(States.ShowingOldBrowser) {
                            onEntry {
                                hideMultiDisclaimer()

                                val oldBrowser = OldProjectDetailsBrowser(project, file)
                                if (this@NewProjectDetailsBrowser.oldBrowser == null) {
                                    this@NewProjectDetailsBrowser.oldBrowser = oldBrowser
                                }
                                rootPanel.remove(loadingPanel)
                                rootPanel.add(oldBrowser.component, BorderLayout.CENTER)
                                rootPanel.revalidate()
                                rootPanel.repaint()
                            }
                            onExit {
                                oldBrowser?.let {
                                    rootPanel.remove(it.component)
                                    Disposer.dispose(it)
                                }
                                oldBrowser = null
                                rootPanel.add(loadingPanel, BorderLayout.CENTER)
                                rootPanel.revalidate()
                                rootPanel.repaint()
                            }
                        }

                    val loadingState =
                        state(States.Loading).apply {
                            onEntry { showProgressBarLoading() }
                            onExit { hideProgressBarLoading() }
                        }

                    listOf(showingErrorState, showingErrorNoGraphState, loadingState).forEach {
                        it.apply {
                            transition<Events.TryLoadPDV> {
                                targetState = loadingState
                                onTriggered { tryLoadPDV(this@createStateMachine) }
                            }
                            transition<Events.RefreshStarted> { targetState = loadingState }
                            transition<Events.ChangeUISettings> { onTriggered { setColors() } }
                        }
                    }

                    // from loading we can go to result states
                    listOf(initialLoadingState, loadingState).apply {
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
                        transition<Events.LoadOldBrowser> { targetState = showingOldBrowserState }
                    }

                    // showingOldBrowserState can only leave if the version changes
                    showingOldBrowserState.apply {
                        transitionConditionally<Events.TryLoadPDV> {
                            direction = {
                                val nxVersion = NxlsService.getInstance(project).nxVersion()

                                if (
                                    nxVersion != null && nxVersion.gte(NxVersion(19, 8, "19.8.0"))
                                ) {
                                    targetState(initialLoadingState)
                                } else {
                                    stay()
                                }
                            }
                        }
                    }

                    registerListeners(this@createStateMachine)
                }
            stateMachine.start()
        }
    }

    private suspend fun tryLoadPDV(stateMachine: StateMachine) {
        if (browser.isDisposed) {
            return
        }
        try {

            val nxlsService = NxlsService.getInstance(project)

            if (!nxlsService.isStarted()) {
                return
            }

            val pdvData = nxlsService.pdvData(file.path)

            if (
                pdvData == null ||
                    pdvData.resultType === "NO_GRAPH_ERROR" ||
                    pdvData.graphBasePath == null
            ) {
                stateMachine.processEvent(Events.LoadErrorNoGraph())
                return
            }

            if (pdvData.resultType == "OLD_NX_VERSION") {
                stateMachine.processEvent(Events.LoadOldBrowser())
                return
            }

            if (pdvData.resultType == "ERROR") {
                stateMachine.processEvent(
                    Events.LoadError(
                        LoadErrorData(
                            pdvData.graphBasePath,
                            pdvData.errorsSerialized ?: "",
                            pdvData.errorMessage ?: "",
                        )
                    )
                )
            } else if (pdvData.resultType == "SUCCESS_MULTI") {
                if (pdvData.pdvDataSerializedMulti != null) {
                    stateMachine.processEvent(
                        Events.LoadSuccessMulti(
                            LoadSuccessMultiData(
                                pdvData.graphBasePath,
                                pdvData.pdvDataSerializedMulti,
                            )
                        )
                    )
                }
            } else if (pdvData.resultType == "SUCCESS") {
                if (pdvData.pdvDataSerialized != null) {
                    stateMachine.processEvent(
                        Events.LoadSuccess(
                            LoadSuccessData(pdvData.graphBasePath, pdvData.pdvDataSerialized)
                        )
                    )
                }
            }
        } catch (e: Throwable) {
            logger<NewProjectDetailsBrowser>().warn("Error loading PDV: ${e.message}")
            stateMachine.processEvent(Events.LoadErrorNoGraph(e.message))
        }
    }

    private suspend fun showPDV(graphBasePath: String, pdvData: String) {
        if (browser.isDisposed || interactionEventQuery.isDisposed) {
            return
        }
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
            window.environment = "nx-console";
        </script>
        <div style="padding: 0.5rem 0.5rem 0.5rem 0.5rem" id="app"></div>

        <script src="runtime.js"></script>
        <script src="styles.js"></script>
        <script src="main.js"></script>

        <script>
          const data = $pdvData

           window.externalApi.graphInteractionEventListener = (message) => {
                    ${interactionEventQuery.inject("JSON.stringify(message)")}
                }
          window.pdvService = window.renderPDV(data)
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

    private suspend fun updatePDVData(pdvData: String) {
        if (browser.isDisposed) {
            return
        }
        browser.executeJavascriptWithCatch(
            """
                    window.pdvService.send({
                      type: 'loadData',
                      ...$pdvData,
                    });
                """
                .trimIndent()
        )
    }

    private suspend fun updateMultiDropdown(projects: Array<String>, selectedProject: String) {
        if (browser.isDisposed) {
            return
        }
        projectsComboBox.removeItemListener(projectsComboBoxListener)
        projectsComboBox.removeAllItems()
        projects.forEach { projectsComboBox.addItem(it) }
        projectsComboBox.item = selectedProject
        projectsComboBox.addItemListener(this@NewProjectDetailsBrowser, projectsComboBoxListener)
    }

    private suspend fun showError(data: LoadErrorData) {
        if (browser.isDisposed) {
            return
        }
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
          const service = window.renderError({
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
        if (browser.isDisposed) {
            return
        }
        val html =
            """
            <html>
            <head>
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
            <h2>Nx Console could not load the Project Details View. </h2>
            <h4>
            This is most likely because local dependencies are not installed. <br/>
            Make sure to run npm/yarn/pnpm/bun install and refresh the workspace using the button on the top right.
            </h4>

            ${if(data.isNotEmpty()) """
             <h4>
                The following error occurred: <br/>
                <pre>${data}</pre>
                See idea.log for more details.
            </h4>
            """.trimIndent() else ""}



            </body>
            </html>
        """
                .trimIndent()

        ApplicationManager.getApplication().invokeLater { browser.loadHTML(html) }
    }

    private suspend fun showProgressBarLoading() {
        withContext(Dispatchers.EDT) { progressBar.isIndeterminate = true }
    }

    private suspend fun hideProgressBarLoading() {
        withContext(Dispatchers.EDT) { progressBar.isIndeterminate = false }
    }

    private fun showMultiDisclaimer() {
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
              body.style?.setProperty('color', '${
                getHexColor(
                    when (!JBColor.isBright()) {
                        true -> UIUtil.getActiveTextColor()
                        false -> UIUtil.getLabelForeground()
                    }
                )
              }', 'important');
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
                                project.nxWorkspace()?.projectGraph?.nodes?.get(it)?.apply {
                                    val path =
                                        nxProjectConfigurationPath(project, data.root)
                                            ?: return@apply
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
                            NxTaskExecutionManager.getInstance(project).execute(it)
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

    private suspend fun registerListeners(stateMachine: StateMachine) {
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
                UISettingsListener { stateMachine.processEventByLaunch(Events.ChangeUISettings()) },
            )
        }
    }

    override fun dispose() {
        if (::stateMachine.isInitialized) {
            scope.launch { stateMachine.stop() }
        }
        if (::messageBusConnection.isInitialized) {
            messageBusConnection.disconnect()
        }

        projectsComboBox.removeItemListener(projectsComboBoxListener)
        Disposer.dispose(browser)
        Disposer.dispose(interactionEventQuery)
    }
}
