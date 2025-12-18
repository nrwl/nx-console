package dev.nx.console.nx_toolwindow

import com.intellij.ide.ui.laf.darcula.ui.DarculaProgressBarUI
import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.EDT
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.ui.JBSplitter
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.components.JBLoadingPanel
import com.intellij.util.ui.UIUtil
import dev.nx.console.cloud.CIPEPollingService
import dev.nx.console.models.CIPEDataResponse
import dev.nx.console.models.NxWorkspace
import dev.nx.console.nx_toolwindow.cloud_tree.CIPETree
import dev.nx.console.nx_toolwindow.cloud_tree.CIPETreeStructure
import dev.nx.console.nx_toolwindow.tree.NxProjectsTree
import dev.nx.console.nx_toolwindow.tree.NxTreeStructure
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxWorkspaceRefreshStartedListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.nxls.WatcherRunningService
import dev.nx.console.settings.options.NX_TOOLWINDOW_STYLE_SETTING_TOPIC
import dev.nx.console.settings.options.NxToolWindowStyleSettingListener
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.nodeInterpreter
import java.awt.BorderLayout
import java.awt.Color
import javax.swing.*
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import ru.nsk.kstatemachine.event.Event
import ru.nsk.kstatemachine.state.*
import ru.nsk.kstatemachine.statemachine.StateMachine
import ru.nsk.kstatemachine.statemachine.createStateMachine
import ru.nsk.kstatemachine.statemachine.stop
import ru.nsk.kstatemachine.transition.TransitionParams

class NxToolWindowPanel(private val project: Project) :
    SimpleToolWindowPanel(true, true), Disposable {

    private val projectTree = NxProjectsTree(project)
    private val projectStructure = NxTreeStructure(projectTree, project)
    private val cipeTree = CIPETree(project)
    private val cipeTreeStructure = CIPETreeStructure(cipeTree, project)

    private val eventChannel = Channel<Event>(capacity = 100)

    // UI Components
    private val nxToolMainComponents = NxToolMainComponents(project)

    // Projects / Tasks UI
    private val projectTreeComponent = ScrollPaneFactory.createScrollPane(projectTree, 0)
    private val toolBar = nxToolMainComponents.createToolbar(projectTree)
    private var mainContent: JComponent? = null
    private var errorCountAndComponent: Pair<Int, JComponent>? = null
    private var daemonWarningBanner: JComponent? = null

    // Cloud UI
    private val cipeTreeComponent = ScrollPaneFactory.createScrollPane(cipeTree, 0)
    private val cipeTreeToolbar = nxToolMainComponents.createRecentCipeToolbar(cipeTreeComponent)
    private val cloudHeaderPanel = nxToolMainComponents.createCloudHeaderPanel()
    private val connectedToNxCloudPanel: JPanel =
        nxToolMainComponents.createConnectedToNxCloudPanel(
            cipeTreeComponent,
            cipeTreeToolbar,
            cloudHeaderPanel,
        )
    private val notConnectedToNxCloudPanel: JPanel =
        nxToolMainComponents.createNotConnectedToNxCloudPanel()

    private val cipeDataListener: (CIPEDataResponse?) -> Unit = { cipeDataResponse ->
        // I don't love that we update the tree view outside of the state machine but
        // it's the easiest solution because everything is onEntry
        cipeDataResponse?.info?.let {
            if (it.isEmpty()) {
                cloudHeaderPanel.isVisible = true
                cipeTreeToolbar.component.isVisible = false
            } else {
                cipeTreeStructure.updateCIPEData(it)
                cipeTreeToolbar.component.isVisible = true
                cloudHeaderPanel.isVisible = false
            }
        }
        loadToolwindowContent()
    }

    private val progressBar =
        JProgressBar().apply {
            isIndeterminate = false
            setUI(
                object : DarculaProgressBarUI() {
                    override fun getRemainderColor(): Color {
                        return UIUtil.getPanelBackground()
                    }

                    override fun getFinishedColor(c: JComponent): Color {
                        return UIUtil.getPanelBackground()
                    }
                }
            )
        }

    private var mainPanel: JPanel = JPanel().apply { layout = BorderLayout() }
    private val loadingPanel = JBLoadingPanel(BorderLayout(), this)
    private val topPanel = JPanel(BorderLayout())
    private val contentSplitter =
        JBSplitter(
            true,
            "NX_CONSOLE.TOOLWINDOW_SPLITTER",
            0.7f,
        ) // Vertical splitter with 70% for main content

    private var stateMachine: StateMachine? = null
    private val stateMachineInitialized = CompletableDeferred<Unit>()

    private val scope: CoroutineScope = ProjectLevelCoroutineHolderService.getInstance(project).cs

    init {
        topPanel.add(progressBar, BorderLayout.NORTH)
        loadingPanel.add(topPanel, BorderLayout.NORTH)
        loadingPanel.add(mainPanel, BorderLayout.CENTER)
        setContent(loadingPanel)

        // Add splitter to main panel
        mainPanel.add(contentSplitter, BorderLayout.CENTER)

        // LAUNCH THE EVENT CONSUMER COROUTINE ONCE
        // This coroutine will serially process all events sent to eventChannel
        scope.launch {
            // Wait for state machine to be initialized once before processing any events
            stateMachineInitialized.await()

            for (event in eventChannel) {
                stateMachine?.processEvent(event)
            }
        }

        // Subscribe to CIPE data changes
        scope.launch {
            CIPEPollingService.getInstance(project).currentData.collect { cipeData ->
                cipeDataListener(cipeData)
            }
        }

        // Subscribe to watcher operational state changes
        scope.launch {
            WatcherRunningService.getInstance(project).isOperational.collect {
                loadToolwindowContent()
            }
        }

        scope.launch {
            stateMachine =
                createStateMachine(
                    scope + Dispatchers.EDT,
                    childMode = ChildMode.PARALLEL,
                    start = true,
                ) {
                    state(States.MainContent) {
                        val noNodeInterpreter = state(MainContentStates.NoNodeInterpreter)
                        val showError = dataState<Int>(MainContentStates.ShowErrors)
                        val showNoProject = state(MainContentStates.ShowNoProject)
                        val showNoNxWorkspace = state(MainContentStates.ShowNoNxWorkspace)
                        val showProjectTree =
                            dataState<NxWorkspace>(MainContentStates.ShowProjectTree)
                        val initialState =
                            initialState(MainContentStates.InitialLoading) {
                                onEntry { loadingPanel.startLoading() }
                                onExit { loadingPanel.stopLoading() }
                            }

                        noNodeInterpreter {
                            onEntry {
                                mainContent =
                                    nxToolMainComponents.createNoNodeInterpreterComponent()
                            }
                        }

                        showError {
                            onEntry {
                                val errorCount = data
                                mainContent =
                                    errorCountAndComponent.let { components ->
                                        if (components == null || components.first != errorCount) {
                                            val newPair =
                                                Pair(
                                                    errorCount,
                                                    nxToolMainComponents.createErrorComponent(
                                                        errorCount
                                                    ),
                                                )
                                            errorCountAndComponent = newPair
                                            newPair.second
                                        } else {
                                            components.second
                                        }
                                    }
                            }
                        }

                        showNoProject {
                            onEntry {
                                mainContent = nxToolMainComponents.createNoProjectsComponent()
                            }
                        }

                        showNoNxWorkspace {
                            onEntry {
                                mainContent = nxToolMainComponents.createNoNxWorkspacePanel()
                            }
                        }

                        showProjectTree {
                            onEntry {
                                mainContent = projectTreeComponent
                                projectStructure.updateNxProjects(data)
                            }
                        }

                        // Add common transitions to all states
                        listOf(
                                initialState,
                                noNodeInterpreter,
                                showError,
                                showNoProject,
                                showNoNxWorkspace,
                                showProjectTree,
                            )
                            .forEach { state ->
                                state.apply {
                                    transition<MainContentEvents.ShowNoNodeInterpreter> {
                                        targetState = noNodeInterpreter
                                    }
                                    transition<MainContentEvents.ShowNoProject> {
                                        targetState = showNoProject
                                    }
                                    transition<MainContentEvents.ShowNoNxWorkspace> {
                                        targetState = showNoNxWorkspace
                                    }
                                    dataTransition<MainContentEvents.ShowErrors, Int> {
                                        targetState = showError
                                    }
                                    dataTransition<MainContentEvents.ShowProjectTree, NxWorkspace> {
                                        targetState = showProjectTree
                                    }
                                }
                            }
                    }

                    state(States.NxCloud) {
                        val hidden = initialState(NxCloudStates.Hidden)
                        val showConnectedToNxCloudPanel =
                            dataState<String>(NxCloudStates.ShowConnectedNxCloudPanel)
                        val showNotConnectedToNxCloudPanel =
                            state(NxCloudStates.ShowConnectNxCloudPanel)

                        hidden {
                            onEntry {
                                connectedToNxCloudPanel.isVisible = false
                                notConnectedToNxCloudPanel.isVisible = false
                                contentSplitter.secondComponent = null
                            }
                            transition<NxCloudEvents.ShowNotConnectedToNxCloud> {
                                targetState = showNotConnectedToNxCloudPanel
                            }
                            dataTransition<NxCloudEvents.ShowConnectedToNxCloud, String> {
                                targetState = showConnectedToNxCloudPanel
                            }
                        }

                        showConnectedToNxCloudPanel {
                            onEntry {
                                connectedToNxCloudPanel.isVisible = true
                                notConnectedToNxCloudPanel.isVisible = false
                                contentSplitter.secondComponent = connectedToNxCloudPanel

                                val cipeInfoList =
                                    CIPEPollingService.getInstance(project).currentData.value?.info
                                        ?: emptyList()
                                if (cipeInfoList.isEmpty()) {
                                    cloudHeaderPanel.isVisible = true
                                    cipeTreeToolbar.component.isVisible = false
                                } else {
                                    cipeTreeStructure.updateCIPEData(cipeInfoList)
                                    cloudHeaderPanel.isVisible = false
                                    cipeTreeToolbar.component.isVisible = true
                                }
                            }
                        }
                        showNotConnectedToNxCloudPanel {
                            onEntry {
                                connectedToNxCloudPanel.isVisible = false
                                notConnectedToNxCloudPanel.isVisible = true
                                contentSplitter.secondComponent = notConnectedToNxCloudPanel
                            }
                        }

                        showConnectedToNxCloudPanel {
                            transition<NxCloudEvents.ShowNotConnectedToNxCloud> {
                                targetState = showNotConnectedToNxCloudPanel
                            }
                            transition<NxCloudEvents.Hide> { targetState = hidden }
                        }

                        showNotConnectedToNxCloudPanel {
                            dataTransition<NxCloudEvents.ShowConnectedToNxCloud, String> {
                                targetState = showConnectedToNxCloudPanel
                            }
                            transition<NxCloudEvents.Hide> { targetState = hidden }
                        }
                    }

                    state(States.Refresh) {
                        val refreshedState = initialState(RefreshStates.Refreshed)
                        val refreshingState = state(RefreshStates.Refreshing)

                        createRefreshStateGroup(refreshedState, refreshingState, progressBar)
                    }

                    addListener(
                        object : StateMachine.Listener {
                            override suspend fun onStateEntry(
                                state: IState,
                                transitionParams: TransitionParams<*>,
                            ) {
                                updateMainPanelContent()
                            }
                        }
                    )
                }

            // Signal that state machine is initialized
            stateMachineInitialized.complete(Unit)

            with(project.messageBus.connect()) {
                subscribe(
                    NxlsService.NX_WORKSPACE_REFRESH_STARTED_TOPIC,
                    object : NxWorkspaceRefreshStartedListener {
                        // for the PDV, we send a manual started event on startup, let's ignore it
                        // here
                        private var isFirst = true

                        override fun onWorkspaceRefreshStarted() {
                            if (!isFirst) {
                                scope.launch { eventChannel.send(RefreshEvents.Refreshing()) }
                            } else {
                                isFirst = false
                            }
                        }
                    },
                )
                subscribe(
                    NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                    NxWorkspaceRefreshListener {
                        scope.launch { eventChannel.send(RefreshEvents.Refreshed()) }
                        loadToolwindowContent()
                    },
                )
                subscribe(
                    NX_TOOLWINDOW_STYLE_SETTING_TOPIC,
                    object : NxToolWindowStyleSettingListener {
                        override fun onNxToolWindowStyleChange() {
                            loadToolwindowContent()
                        }
                    },
                )
                subscribe(
                    ToggleNxCloudViewAction.NX_TOOLWINDOW_CLOUD_VIEW_COLLAPSED_TOPIC,
                    object : ToggleNxCloudViewAction.NxToolwindowCloudViewCollapsedListener {
                        override fun onCloudViewCollapsed() {
                            loadToolwindowContent()
                        }
                    },
                )
            }

            loadToolwindowContent()
        }
    }

    private fun loadToolwindowContent() {
        if (project.isDisposed) return
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val nxlsService = NxlsService.getInstance(project)
            val workspace = nxlsService.workspace()

            withContext(Dispatchers.EDT) {
                val hasProjects =
                    workspace != null && !(workspace.projectGraph?.nodes.isNullOrEmpty())
                val hasNodeInterpreter =
                    try {
                        project.nodeInterpreter
                        true
                    } catch (e: Exception) {
                        false
                    }

                // Update daemon warning banner
                val daemonDisabled = workspace?.daemonEnabled == false
                val watcherNotRunning =
                    !daemonDisabled &&
                        !WatcherRunningService.getInstance(project).isOperational.value
                updateDaemonWarningBanner(
                    when {
                        daemonDisabled -> DaemonWarningType.DAEMON_DISABLED
                        watcherNotRunning -> DaemonWarningType.WATCHER_NOT_RUNNING
                        else -> null
                    }
                )

                // SEND EVENTS TO CHANNEL INSTEAD OF DIRECTLY CALLING processEvent
                if (!hasNodeInterpreter) {
                    eventChannel.send(MainContentEvents.ShowNoNodeInterpreter())
                } else if (
                    workspace?.let {
                        !it.errors.isNullOrEmpty() && (it.isPartial != true || !hasProjects)
                    } == true
                ) {
                    val errorCount = workspace.errors!!.size
                    eventChannel.send(MainContentEvents.ShowErrors(errorCount))
                } else if (workspace == null) {
                    eventChannel.send(MainContentEvents.ShowNoNxWorkspace())
                } else if (!hasProjects) {
                    eventChannel.send(MainContentEvents.ShowNoProject())
                } else {
                    // same here, I don't love this but it's okay for now
                    projectStructure.updateNxProjects(workspace)
                    eventChannel.send(MainContentEvents.ShowProjectTree(workspace))
                }

                toolBar.targetComponent = this@NxToolWindowPanel
                toolbar = toolBar.component
            }

            if (getCloudPanelCollapsed(project)) {
                eventChannel.send(NxCloudEvents.Hide())
            } else {
                val cloudStatus = withContext(Dispatchers.IO) { nxlsService.cloudStatus() }
                cloudStatus?.let {
                    if (cloudStatus.isConnected) {
                        eventChannel.send(
                            NxCloudEvents.ShowConnectedToNxCloud(
                                cloudStatus.nxCloudUrl ?: "https://cloud.nx.app"
                            )
                        )
                    } else {
                        eventChannel.send(NxCloudEvents.ShowNotConnectedToNxCloud())
                    }
                }
            }
        }
    }

    private fun updateMainPanelContent() {
        mainContent?.let { contentSplitter.firstComponent = it }

        // The cloud panel (second component) is managed by the state machine
        // so we don't need to set it here

        mainPanel.revalidate() // Recalculate layout
        mainPanel.repaint() // Redraw
    }

    private fun updateDaemonWarningBanner(type: DaemonWarningType?) {
        // Remove existing banner if any
        daemonWarningBanner?.let { topPanel.remove(it) }
        daemonWarningBanner = null

        // Add new banner if type is provided
        if (type != null) {
            daemonWarningBanner = nxToolMainComponents.createDaemonWarningBanner(type)
            topPanel.add(daemonWarningBanner, BorderLayout.CENTER)
        }

        topPanel.revalidate()
        topPanel.repaint()
    }

    companion object {
        const val NX_TOOLBAR_PLACE = "Nx Toolbar"
        private const val CLOUD_PANEL_COLLAPSED_PROPERTY_KEY =
            "dev.nx.console.toolwindow.cloud_panel_collapse"

        fun getCloudPanelCollapsed(project: Project): Boolean {
            return PropertiesComponent.getInstance(project)
                .getBoolean(CLOUD_PANEL_COLLAPSED_PROPERTY_KEY)
        }

        fun setCloudPanelCollapsed(project: Project, collapsed: Boolean) {
            PropertiesComponent.getInstance(project)
                .setValue(CLOUD_PANEL_COLLAPSED_PROPERTY_KEY, collapsed)
        }
    }

    override fun dispose() {
        stateMachine?.let { scope.launch { it.stop() } }
        mainContent = null
        errorCountAndComponent = null
        daemonWarningBanner = null

        // No need to remove listener since we're using StateFlow collection

        eventChannel.close()
    }
}
