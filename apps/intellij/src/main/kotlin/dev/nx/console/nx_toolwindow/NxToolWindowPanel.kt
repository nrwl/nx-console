package dev.nx.console.nx_toolwindow

import com.intellij.ide.ui.laf.darcula.ui.DarculaProgressBarUI
import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.EDT
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.components.JBLoadingPanel
import com.intellij.util.ui.UIUtil
import dev.nx.console.cloud.CIPEPollingService
import dev.nx.console.models.CIPEDataResponse
import dev.nx.console.models.NxWorkspace
import dev.nx.console.nx_toolwindow.cloud_tree.CIPETreeStructure
import dev.nx.console.nx_toolwindow.tree.NxProjectsTree
import dev.nx.console.nx_toolwindow.tree.NxTreeStructure
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxWorkspaceRefreshStartedListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.actions.NxConnectService
import dev.nx.console.settings.options.NX_TOOLWINDOW_STYLE_SETTING_TOPIC
import dev.nx.console.settings.options.NxToolWindowStyleSettingListener
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.nodeInterpreter
import java.awt.BorderLayout
import java.awt.Color
import java.awt.event.ActionEvent
import javax.swing.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
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

    private val cipeTreeStructure = CIPETreeStructure(project)

    private val eventChannel = Channel<Event>(capacity = 100)

    private val projectTreeComponent = ScrollPaneFactory.createScrollPane(projectTree, 0)
    private val nxToolMainComponents = NxToolMainComponents(project)
    private val toolBar = nxToolMainComponents.createToolbar(projectTree)
    private var mainContent: MutableRef<JComponent?> = MutableRef(null)
    private var errorCountAndComponent: MutableRef<Pair<Int, JComponent>?> = MutableRef(null)
    private var openNxCloudPanel: MutableRef<JPanel?> = MutableRef(null)
    private var connectToNxCloudPanel: MutableRef<JPanel?> = MutableRef(null)

    // CIPE data update listener
    private val cipeDataListener: (CIPEDataResponse) -> Unit = { cipeData ->
        scope.launch {
            withContext(Dispatchers.EDT) {
                // Update tree with real CIPE data
                cipeData.info?.let { cipeInfoList ->
                    cipeTreeStructure.updateCIPEData(cipeInfoList)
                }
                    ?: run {
                        // Clear data if no CIPEs
                        cipeTreeStructure.updateCIPEData(emptyList())
                    }

                // Force tree refresh
                openNxCloudPanel.value?.revalidate()
                openNxCloudPanel.value?.repaint()
            }
        }
    }

    private val progressBar =
        JProgressBar().apply {
            isIndeterminate = false
            setUI(
                object : DarculaProgressBarUI() {
                    override fun getRemainderColor(): Color {
                        return UIUtil.getPanelBackground()
                    }
                }
            )
        }

    private var mainPanel: JPanel =
        JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            add(Box.createVerticalGlue()) // Glue stays
        }
    private val loadingPanel = JBLoadingPanel(BorderLayout(), this)
    private val topPanel = JPanel(BorderLayout())

    private lateinit var stateMachine: StateMachine

    private val scope: CoroutineScope = ProjectLevelCoroutineHolderService.getInstance(project).cs

    init {
        topPanel.add(progressBar, BorderLayout.NORTH)
        loadingPanel.add(topPanel, BorderLayout.NORTH)
        loadingPanel.add(mainPanel, BorderLayout.CENTER)
        setContent(loadingPanel)

        // LAUNCH THE EVENT CONSUMER COROUTINE ONCE
        // This coroutine will serially process all events sent to eventChannel
        scope.launch {
            for (event in eventChannel) {
                stateMachine.processEvent(event)
            }
        }

        val cipePollingService = CIPEPollingService.getInstance(project)
        cipePollingService.addDataUpdateListener(cipeDataListener)

        scope.launch {
            NxlsService.getInstance(project).awaitStarted()
            CIPEPollingService.getInstance(project).forcePoll()
        }


        scope.launch {
            stateMachine =
                createStateMachine(scope, childMode = ChildMode.PARALLEL, start = true) {
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

                        createMainContentStateGroup(
                            noNodeInterpreter,
                            showError,
                            showNoProject,
                            showNoNxWorkspace,
                            showProjectTree,
                            initialState,
                            mainContent,
                            nxToolMainComponents,
                            errorCountAndComponent,
                            projectTreeComponent,
                            projectStructure
                        )
                    }

                    state(States.NxCloud) {
                        val hidden = initialState(NxCloudStates.Hidden)
                        val showConnectedNxCloudPanel =
                            dataState<String>(NxCloudStates.ShowConnectedNxCloudPanel)
                        val showConnectNxCloudPanel = state(NxCloudStates.ShowConnectNxCloudPanel)

                        createNxCloudStateGroup(
                            hidden,
                            showConnectedNxCloudPanel,
                            showConnectNxCloudPanel,
                            openNxCloudPanel,
                            connectToNxCloudPanel,
                            nxToolMainComponents,
                            nxConnectActionListener,
                            cipeTreeStructure
                        )
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
                                transitionParams: TransitionParams<*>
                            ) {
                                updateMainPanelContent()
                            }
                        }
                    )
                }
            loadToolwindowContent()
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
                    }
                )
                subscribe(
                    NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                    NxWorkspaceRefreshListener {
                        scope.launch { eventChannel.send(RefreshEvents.Refreshed()) }
                        loadToolwindowContent()
                    }
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

                // SEND EVENTS TO CHANNEL INSTEAD OF DIRECTLY CALLING processEvent
                if (!hasNodeInterpreter) {
                    scope.launch { eventChannel.send(MainContentEvents.ShowNoNodeInterpreter()) }
                } else if (
                    workspace?.let {
                        !it.errors.isNullOrEmpty() && (it.isPartial != true || !hasProjects)
                    } == true
                ) {
                    val errorCount = workspace.errors!!.size
                    scope.launch { eventChannel.send(MainContentEvents.ShowErrors(errorCount)) }
                } else if (workspace == null) {
                    scope.launch { eventChannel.send(MainContentEvents.ShowNoNxWorkspace()) }
                } else if (!hasProjects) {
                    scope.launch { eventChannel.send(MainContentEvents.ShowNoProject()) }
                } else {
                    scope.launch { eventChannel.send(MainContentEvents.ShowProjectTree(workspace)) }
                }

                toolBar.targetComponent = this@NxToolWindowPanel
                toolbar = toolBar.component
            }

            // Check cloud panel visibility
            if (getCloudPanelCollapsed(project)) {
                // Send hide event when panel is collapsed
                scope.launch { eventChannel.send(NxCloudEvents.Hide()) }
            } else {
                // Load cloud status if panel is not collapsed
                val cloudStatus = nxlsService.cloudStatus()
                cloudStatus?.let {
                    // THESE EVENTS ALSO NEED TO BE SENT TO THE CHANNEL
                    if (cloudStatus.isConnected) {
                        scope.launch {
                            eventChannel.send(
                                NxCloudEvents.ShowOpenNxCloud(
                                    cloudStatus.nxCloudUrl ?: "https://cloud.nx.app"
                                )
                            )
                        }
                    } else {
                        scope.launch { eventChannel.send(NxCloudEvents.ShowConnectToNxCloud()) }
                    }
                }
            }
        }
    }

    private val nxConnectActionListener =
        object : AbstractAction() {
            override fun actionPerformed(e: ActionEvent?) {
                NxConnectService.getInstance(project).connectToCloud()
            }
        }

    private fun updateMainPanelContent() {
        mainPanel.removeAll() // Clear existing content

        mainContent.value?.let { mainPanel.add(it) } // Add new content
        mainPanel.add(Box.createVerticalGlue())
        openNxCloudPanel.value?.let { mainPanel.add(it) }
        connectToNxCloudPanel.value?.let { mainPanel.add(it) }

        mainPanel.revalidate() // Recalculate layout
        mainPanel.repaint() // Redraw
    }

    companion object {
        const val NX_TOOLBAR_PLACE = "Nx Toolbar"
        private const val NX_CLOUD_LEARN_MORE_TEXT =
            "<html>To learn more about Nx Cloud, check out <a href='https://nx.dev/ci/intro/why-nx-cloud?utm_source=nxconsole'> Why Nx Cloud?</a> or get an overview of <a href='https://nx.dev/ci/features?utm_source=nxconsole'> Nx Cloud features </a>. </html>"
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
        if (::stateMachine.isInitialized) {
            scope.launch { stateMachine.stop() }
        }
        mainContent.value = null
        errorCountAndComponent.value = null
        openNxCloudPanel.value = null
        connectToNxCloudPanel.value = null

        // Clean up CIPE polling listener
        val cipePollingService = CIPEPollingService.getInstance(project)
        cipePollingService.removeDataUpdateListener(cipeDataListener)

        // It's good practice to close the channel when the Disposable is disposed
        eventChannel.close()
    }
}
