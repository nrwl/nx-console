package dev.nx.console.nx_toolwindow

import com.intellij.icons.AllIcons
import com.intellij.ide.DefaultTreeExpander
import com.intellij.ide.TreeExpander
import com.intellij.ide.actions.RefreshAction
import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.EDT
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.ui.ScrollPaneFactory
import com.intellij.util.messages.Topic
import dev.nx.console.models.NxWorkspace
import dev.nx.console.nx_toolwindow.tree.NxProjectsTree
import dev.nx.console.nx_toolwindow.tree.NxTreeStructure
import dev.nx.console.nxls.NxRefreshWorkspaceService
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxWorkspaceRefreshStartedListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.actions.NxConnectService
import dev.nx.console.settings.options.NX_TOOLWINDOW_STYLE_SETTING_TOPIC
import dev.nx.console.settings.options.NxToolWindowStyleSettingListener
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.nodeInterpreter
import java.awt.EventQueue.invokeLater
import java.awt.event.ActionEvent
import javax.swing.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import ru.nsk.kstatemachine.state.*
import ru.nsk.kstatemachine.statemachine.StateMachine
import ru.nsk.kstatemachine.statemachine.createStateMachine
import ru.nsk.kstatemachine.transition.TransitionParams

class NxToolWindowPanel(private val project: Project) : SimpleToolWindowPanel(true, true) {

    private val projectTree = NxProjectsTree(project)
    private val projectStructure = NxTreeStructure(projectTree, project)

    private val projectTreeComponent = ScrollPaneFactory.createScrollPane(projectTree, 0)
    private val nxToolMainComponents = NxToolMainComponents(project)
    private val toolBar = createToolbar()
    private var mainContent: MutableRef<JComponent?> = MutableRef(null)
    private var errorCountAndComponent: MutableRef<Pair<Int, JComponent>?> = MutableRef(null)
    private var openNxCloudPanel: MutableRef<JPanel?> = MutableRef(null)
    private var connectToNxCloudPanel: MutableRef<JPanel?> = MutableRef(null)

    private lateinit var stateMachine: StateMachine

    init {
        val scope: CoroutineScope = ProjectLevelCoroutineHolderService.getInstance(project).cs
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
                        val initialState = initialState(MainContentStates.InitialLoading)

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
                        val showConnectedNxCloudPanel =
                            dataState<String>(NxCloudStates.ShowConnectedNxCloudPanel)
                        val showConnectNxCloudPanel = state(NxCloudStates.ShowConnectNxCloudPanel)
                        val initializeNxCloud = initialState(NxCloudStates.InitializeNxCloud)

                        createNxCloudStateGroup(
                            showConnectedNxCloudPanel,
                            showConnectNxCloudPanel,
                            openNxCloudPanel,
                            connectToNxCloudPanel,
                            nxToolMainComponents,
                            nxConnectActionListener
                        )

                        initializeNxCloud {
                            onEntry { loadToolwindowContent(this@createStateMachine) }
                            transition<NxCloudEvents.ShowConnectToNxCloud> {
                                targetState = showConnectNxCloudPanel
                            }
                            dataTransition<NxCloudEvents.ShowOpenNxCloud, String> {
                                targetState = showConnectedNxCloudPanel
                            }
                        }
                    }

                    state(States.Refresh) {
                        val refreshedState = initialState(RefreshStates.Refreshed)
                        val refreshingState = state(RefreshStates.Refreshing)

                        createRefreshStateGroup(refreshedState, refreshingState)
                    }

                    addListener(
                        object : StateMachine.Listener {
                            override suspend fun onStateEntry(
                                state: IState,
                                transitionParams: TransitionParams<*>
                            ) {
                                when (state.name) {
                                    RefreshStates.Refreshing -> {
                                        setContent(nxToolMainComponents.createSpinnerPanel())
                                    }
                                    else -> {
                                        setContent(showContentWithCloud())
                                    }
                                }
                            }
                        }
                    )
                }

            with(project.messageBus.connect()) {
                subscribe(
                    NxlsService.NX_WORKSPACE_REFRESH_STARTED_TOPIC,
                    NxWorkspaceRefreshStartedListener {
                        invokeLater {
                            scope.launch { stateMachine.processEvent(RefreshEvents.Refreshing()) }
                        }
                    },
                )
                subscribe(
                    NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                    NxWorkspaceRefreshListener {
                        invokeLater {
                            scope.launch { stateMachine.processEvent(RefreshEvents.Refreshed()) }
                            loadToolwindowContent(stateMachine)
                        }
                    },
                )
                subscribe(
                    NX_TOOLWINDOW_STYLE_SETTING_TOPIC,
                    object : NxToolWindowStyleSettingListener {
                        override fun onNxToolWindowStyleChange() {
                            invokeLater { loadToolwindowContent(stateMachine) }
                        }
                    },
                )
                subscribe(
                    ToggleNxCloudViewAction.NX_TOOLWINDOW_CLOUD_VIEW_COLLAPSED_TOPIC,
                    object : ToggleNxCloudViewAction.NxToolwindowCloudViewCollapsedListener {
                        override fun onCloudViewCollapsed() {
                            invokeLater { loadToolwindowContent(stateMachine) }
                        }
                    },
                )
            }
        }
    }

    private fun loadToolwindowContent(stateMachine: StateMachine) {
        if (project.isDisposed) return
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val nxlsService = NxlsService.getInstance(project)
            val workspace = nxlsService.workspace()

            withContext(Dispatchers.EDT) {
                val hasProjects = workspace?.projectGraph?.nodes?.isNotEmpty() == true
                val hasNodeInterpreter =
                    try {
                        project.nodeInterpreter
                        true
                    } catch (e: Exception) {
                        false
                    }

                if (!hasNodeInterpreter) {
                    stateMachine.processEvent(MainContentEvents.ShowNoNodeInterpreter())
                } else if (
                    workspace?.let {
                        !it.errors.isNullOrEmpty() && (it.isPartial != true || !hasProjects)
                    } == true
                ) {
                    val errorCount = workspace.errors!!.size
                    stateMachine.processEvent(MainContentEvents.ShowErrors(errorCount))
                } else if (workspace == null) {
                    stateMachine.processEvent(MainContentEvents.ShowNoNxWorkspace())
                } else if (workspace.projectGraph.nodes.isEmpty()) {
                    stateMachine.processEvent(MainContentEvents.ShowNoProject())
                } else {
                    stateMachine.processEvent(MainContentEvents.ShowProjectTree(workspace))
                }

                toolBar.targetComponent = this@NxToolWindowPanel
                toolbar = toolBar.component
            }

            val cloudStatus = nxlsService.cloudStatus()
            cloudStatus?.let {
                if (cloudStatus.isConnected) {
                    stateMachine.processEvent(
                        NxCloudEvents.ShowOpenNxCloud(
                            cloudStatus.nxCloudUrl ?: "https://cloud.nx.app"
                        )
                    )
                } else {
                    stateMachine.processEvent(NxCloudEvents.ShowConnectToNxCloud())
                }
            }
        }
    }

    private fun createToolbar(): ActionToolbar {
        return run {
            val actionManager = ActionManager.getInstance()
            val actionGroup =
                object : DefaultActionGroup() {
                        override fun getActionUpdateThread() = ActionUpdateThread.BGT
                    }
                    .apply { templatePresentation.text = "Nx Toolwindow" }

            val refreshAction =
                object :
                    RefreshAction(
                        "Reload Nx Projects",
                        "Reload Nx projects",
                        AllIcons.Actions.Refresh,
                    ) {
                    override fun getActionUpdateThread() = ActionUpdateThread.BGT

                    override fun update(e: AnActionEvent) {
                        e.presentation.isEnabled = true
                    }

                    override fun actionPerformed(e: AnActionEvent) {
                        TelemetryService.getInstance(project)
                            .featureUsed(
                                TelemetryEvent.MISC_REFRESH_WORKSPACE,
                                mapOf("source" to TelemetryEventSource.PROJECTS_VIEW),
                            )
                        NxRefreshWorkspaceService.getInstance(project).refreshWorkspace()
                    }
                }

            val tree = projectStructure.tree
            refreshAction.registerShortcutOn(tree)

            actionGroup.addAction(refreshAction)
            actionGroup.addSeparator()
            actionGroup.add(
                actionManager.getAction("dev.nx.console.generate.actions.NxGenerateUiAction")
            )
            actionGroup.add(
                actionManager.getAction("dev.nx.console.graph.actions.NxGraphSelectAllAction")
            )
            actionGroup.addSeparator()

            val expander: TreeExpander = DefaultTreeExpander(tree)

            val expandAllAction =
                object : AnAction("Expand All", "Expand all items", AllIcons.Actions.Expandall) {
                    override fun getActionUpdateThread() = ActionUpdateThread.BGT

                    override fun actionPerformed(e: AnActionEvent) {
                        expander.expandAll()
                    }
                }

            val collapseAllAction =
                object :
                    AnAction("Collapse All", "Collapse all items", AllIcons.Actions.Collapseall) {
                    override fun getActionUpdateThread() = ActionUpdateThread.BGT

                    override fun actionPerformed(e: AnActionEvent) {
                        expander.collapseAll()
                    }
                }

            actionGroup.add(expandAllAction)
            actionGroup.add(collapseAllAction)

            actionManager.createActionToolbar(NX_TOOLBAR_PLACE, actionGroup, true)
        }
    }

    private val nxConnectActionListener =
        object : AbstractAction() {
            override fun actionPerformed(e: ActionEvent?) {
                NxConnectService.getInstance(project).connectToCloud()
            }
        }

    private fun showContentWithCloud(): JComponent {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            mainContent.value?.let { add(mainContent.value) }
            add(Box.createVerticalGlue())
            openNxCloudPanel.value?.let { add(openNxCloudPanel.value) }
            connectToNxCloudPanel.value?.let { add(connectToNxCloudPanel.value) }
        }
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
}

class ToggleNxCloudViewAction : ToggleAction("Show Nx Cloud Panel") {

    override fun getActionUpdateThread() = ActionUpdateThread.EDT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        NxToolWindowPanel.setCloudPanelCollapsed(
            project,
            !NxToolWindowPanel.getCloudPanelCollapsed(project),
        )
        project.messageBus
            .syncPublisher(NX_TOOLWINDOW_CLOUD_VIEW_COLLAPSED_TOPIC)
            .onCloudViewCollapsed()
    }

    override fun isSelected(e: AnActionEvent): Boolean {
        val project = e.project ?: return true
        return !NxToolWindowPanel.getCloudPanelCollapsed(project)
    }

    override fun setSelected(e: AnActionEvent, state: Boolean) {
        val project = e.project ?: return
        NxToolWindowPanel.setCloudPanelCollapsed(project, !state)
    }

    companion object {
        val NX_TOOLWINDOW_CLOUD_VIEW_COLLAPSED_TOPIC:
            Topic<NxToolwindowCloudViewCollapsedListener> =
            Topic(
                "NxToolwindowCloudViewCollapsedTopic",
                NxToolwindowCloudViewCollapsedListener::class.java,
            )
    }

    interface NxToolwindowCloudViewCollapsedListener {
        fun onCloudViewCollapsed()
    }
}
