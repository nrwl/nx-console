package dev.nx.console.nx_toolwindow

import com.intellij.icons.AllIcons
import com.intellij.ide.DefaultTreeExpander
import com.intellij.ide.TreeExpander
import com.intellij.ide.actions.RefreshAction
import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.Disposable
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.EDT
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.ui.ScrollPaneFactory
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
import java.awt.BorderLayout
import java.awt.EventQueue.invokeLater
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

    // Declare the channel to serialize all KStateMachine events
    private val eventChannel = Channel<Event>(Channel.UNLIMITED)

    private val projectTreeComponent = ScrollPaneFactory.createScrollPane(projectTree, 0)
    private val nxToolMainComponents = NxToolMainComponents(project)
    private val toolBar = createToolbar()
    private var mainContent: MutableRef<JComponent?> = MutableRef(null)
    private var errorCountAndComponent: MutableRef<Pair<Int, JComponent>?> = MutableRef(null)
    private var openNxCloudPanel: MutableRef<JPanel?> = MutableRef(null)
    private var connectToNxCloudPanel: MutableRef<JPanel?> = MutableRef(null)
    private val progressBar = JProgressBar()

    private var mainPanel: JPanel =
        JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            add(Box.createVerticalGlue()) // Glue stays
        }
    private var loadingPanel: JPanel = JPanel(BorderLayout())

    private lateinit var stateMachine: StateMachine

    private val scope: CoroutineScope = ProjectLevelCoroutineHolderService.getInstance(project).cs

    init {
        loadingPanel.add(progressBar, BorderLayout.NORTH) // Add progressBar once if it's static
        loadingPanel.add(mainPanel, BorderLayout.CENTER) // Add mainPanel once
        setContent(loadingPanel)

        // LAUNCH THE EVENT CONSUMER COROUTINE ONCE
        // This coroutine will serially process all events sent to eventChannel
        scope.launch {
            for (event in eventChannel) {
                stateMachine.processEvent(event)
            }
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
                            // Ensure loadToolwindowContent is called on EDT
                            onEntry { withContext(Dispatchers.EDT) { loadToolwindowContent() } }
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
                                println(state)
                                when (state.name) {
                                    RefreshStates.Refreshing -> {
                                        withContext(Dispatchers.EDT) {
                                            progressBar.isIndeterminate = true
                                        }
                                    }
                                    RefreshStates.Refreshed -> {
                                        withContext(Dispatchers.EDT) {
                                            progressBar.isIndeterminate = false
                                        }
                                    }
                                    else -> {
                                        updateMainPanelContent()
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
                        // SEND EVENT TO CHANNEL INSTEAD OF DIRECTLY CALLING processEvent
                        scope.launch { eventChannel.send(RefreshEvents.Refreshing()) }
                        // scope.launch {  showProgressBarLoading() }
                    },
                )
                subscribe(
                    NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                    NxWorkspaceRefreshListener {
                        // loadToolwindowContent still needs to manage its own threading,
                        // especially for UI updates
                        invokeLater { loadToolwindowContent() }
                        // SEND EVENT TO CHANNEL INSTEAD
                        scope.launch { eventChannel.send(RefreshEvents.Refreshed()) }
                    },
                )
                subscribe(
                    NX_TOOLWINDOW_STYLE_SETTING_TOPIC,
                    object : NxToolWindowStyleSettingListener {
                        override fun onNxToolWindowStyleChange() {
                            // If this triggers a state machine event, send it to the channel.
                            // If it just updates UI, ensure it's on EDT.
                            invokeLater { loadToolwindowContent() }
                        }
                    },
                )
                subscribe(
                    ToggleNxCloudViewAction.NX_TOOLWINDOW_CLOUD_VIEW_COLLAPSED_TOPIC,
                    object : ToggleNxCloudViewAction.NxToolwindowCloudViewCollapsedListener {
                        override fun onCloudViewCollapsed() {
                            // If this triggers a state machine event, send it to the channel.
                            // If it just updates UI, ensure it's on EDT.
                            invokeLater { loadToolwindowContent() }
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
                val hasProjects = workspace?.projectGraph?.nodes?.isNotEmpty() == true
                val hasNodeInterpreter =
                    try {
                        project.nodeInterpreter
                        true
                    } catch (e: Exception) {
                        false
                    }

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
                } else if (workspace.projectGraph.nodes.isEmpty()) {
                    eventChannel.send(MainContentEvents.ShowNoProject())
                } else {
                    eventChannel.send(MainContentEvents.ShowProjectTree(workspace))
                }

                toolBar.targetComponent = this@NxToolWindowPanel
                toolbar = toolBar.component
            }

            val cloudStatus = nxlsService.cloudStatus()
            cloudStatus?.let {
                // THESE EVENTS ALSO NEED TO BE SENT TO THE CHANNEL
                if (cloudStatus.isConnected) {
                    eventChannel.send(
                        NxCloudEvents.ShowOpenNxCloud(
                            cloudStatus.nxCloudUrl ?: "https://cloud.nx.app"
                        )
                    )
                } else {
                    eventChannel.send(NxCloudEvents.ShowConnectToNxCloud())
                }
            }
        }
    }

    private fun createNoProjectsComponent(): JComponent {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)

            add(
                JPanel().apply {
                    layout = BoxLayout(this, BoxLayout.Y_AXIS)
                    border = BorderFactory.createEmptyBorder(10, 10, 10, 10)

                    add(
                        JLabel(
                                "<html><h3>We couldn't find any projects in this workspace.</h3> Make sure that the proper dependencies are installed locally and refresh the workspace.</html>"
                            )
                            .apply { alignmentX = Component.CENTER_ALIGNMENT }
                    )

                    add(Box.createRigidArea(Dimension(0, 10)))

                    add(
                        JButton("Refresh Workspace").apply {
                            action =
                                object : AbstractAction("Refresh Workspace") {
                                    override fun actionPerformed(e: java.awt.event.ActionEvent?) {
                                        TelemetryService.getInstance(project)
                                            .featureUsed(
                                                TelemetryEvent.MISC_REFRESH_WORKSPACE,
                                                mapOf(
                                                    "source" to TelemetryEventSource.WELCOME_VIEW
                                                ),
                                            )
                                        NxRefreshWorkspaceService.getInstance(project)
                                            .refreshWorkspace()
                                    }
                                }
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 10)))

                    add(
                        panel {
                            row {
                                text(
                                        " If you're just getting started with Nx, you can <a href='https://nx.dev/plugin-features/use-code-generators'>use generators</a> to quickly scaffold new projects or <a href='https://nx.dev/reference/project-configuration'>add them manually</a>.<br/> If your Nx workspace is not at the root of the opened project, make sure to set the <a href='open-setting'>workspace path setting</a>."
                                    ) {
                                        if (it.description == "open-setting") {
                                            ShowSettingsUtil.getInstance()
                                                .showSettingsDialog(
                                                    project,
                                                    NxConsoleSettingsConfigurable::class.java,
                                                )
                                        } else {
                                            BrowserLauncher.instance.browse(
                                                URI.create(it.description)
                                            )
                                        }
                                    }
                                    .align(Align.CENTER)
                            }
                        }
                    )
                }
            )
        }
    }

    private fun createErrorComponent(errorCount: Int): JComponent {
        return panel {
            indent {
                row {
                    text(
                        "<h3> Nx caught ${if(errorCount == 1) "an error" else "$errorCount errors"} while computing the project graph.</h3>"
                    )
                }
                row {
                    button("View Errors") { ProblemsView.getToolWindow(project)?.show() }
                        .align(Align.CENTER)
                }
                row {
                    text(
                        "If the problems persist, you can try running <code>nx reset</code> and then <a href='refresh'>refresh the workspace</a><br /> For more information, look for errors in <a href='open-idea-log'>idea.log</a> and refer to the <a href='https://nx.dev/troubleshooting/troubleshoot-nx-install-issues?utm_source=nxconsole'>Nx Troubleshooting Guide </a> and the <a href='https://nx.dev/recipes/nx-console/console-troubleshooting?utm_source=nxconsole'>Nx Console Troubleshooting Guide</a>."
                    ) {
                        if (it.description == "refresh") {
                            NxRefreshWorkspaceService.getInstance(project).refreshWorkspace()
                        } else if (it.description == "open-idea-log") {
                            val action = ActionManager.getInstance().getAction("OpenLog")

                            ActionManager.getInstance()
                                .tryToExecute(action, null, null, NX_TOOLBAR_PLACE, true)
                        } else {
                            BrowserLauncher.instance.browse(URI.create(it.description))
                        }
                    }
                }
            }
        }
    }

    private fun createNoNodeInterpreterComponent(): JComponent {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)

            add(
                JPanel().apply {
                    layout = BoxLayout(this, BoxLayout.Y_AXIS)
                    border = BorderFactory.createEmptyBorder(10, 10, 10, 10)

                    add(
                        JLabel(
                                "<html><h3>Node.js interpreter not configured.</h3> Nx Console needs this setting to start the Nx language server and run Nx processes.</html>"
                            )
                            .apply { alignmentX = Component.CENTER_ALIGNMENT }
                    )

                    add(Box.createRigidArea(Dimension(0, 10)))

                    add(
                        JButton("Configure Node interpreter").apply {
                            action =
                                object : AbstractAction("Configure Node interpreter") {
                                    override fun actionPerformed(e: java.awt.event.ActionEvent?) {
                                        ShowSettingsUtil.getInstance()
                                            .showSettingsDialog(
                                                project,
                                                NodeSettingsConfigurable::class.java,
                                            )
                                    }
                                }
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )
                    add(Box.createRigidArea(Dimension(0, 10)))

                    add(
                        panel {
                            row {
                                text(
                                    "Please configure the Node interpreter and then <a href='refresh'>refresh the workspace</a>"
                                ) {
                                    if (it.description == "refresh") {
                                        NxRefreshWorkspaceService.getInstance(project)
                                            .refreshWorkspace()
                                    }
                                }
                            }
                        }
                    )
                }
            )
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

        // It's good practice to close the channel when the Disposable is disposed
        eventChannel.close()
    }
}
