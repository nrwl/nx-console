package dev.nx.console.nx_toolwindow

import com.intellij.analysis.problemsView.toolWindow.ProblemsView
import com.intellij.icons.AllIcons
import com.intellij.ide.DefaultTreeExpander
import com.intellij.ide.TreeExpander
import com.intellij.ide.actions.RefreshAction
import com.intellij.ide.browsers.BrowserLauncher
import com.intellij.ide.util.PropertiesComponent
import com.intellij.javascript.nodejs.settings.NodeSettingsConfigurable
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.EDT
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.ui.HyperlinkLabel
import com.intellij.ui.JBColor
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.dsl.builder.Align
import com.intellij.ui.dsl.builder.panel
import com.intellij.util.messages.Topic
import com.intellij.util.ui.JBUI
import dev.nx.console.models.NxWorkspace
import dev.nx.console.nx_toolwindow.tree.NxProjectsTree
import dev.nx.console.nx_toolwindow.tree.NxTreeStructure
import dev.nx.console.nxls.NxRefreshWorkspaceService
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.actions.NxConnectService
import dev.nx.console.settings.NxConsoleSettingsConfigurable
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.nodeInterpreter
import java.awt.*
import java.awt.event.ActionEvent
import java.awt.event.ActionListener
import java.net.URI
import javax.swing.*
import javax.swing.border.CompoundBorder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import ru.nsk.kstatemachine.event.DataEvent
import ru.nsk.kstatemachine.event.Event
import ru.nsk.kstatemachine.state.*
import ru.nsk.kstatemachine.statemachine.StateMachine
import ru.nsk.kstatemachine.statemachine.createStateMachine
import ru.nsk.kstatemachine.transition.TransitionParams

object States {
    const val MainContent = "MainContent"
    const val NxCloud = "NxCloud"
}

object MainContentStates {
    const val InitialLoading = "InitialLoading"
    const val NoNodeInterpreter = "NoNodeInterpreter"
    const val ShowErrors = "ShowErrors"
    const val ShowNoProject = "ShowNoProject"
    const val ShowProjectTree = "ShowProjectTree"
}

object NxCloudStates {
    const val InitializeNxCloud = "InitializeNxCloud"
    const val ShowOpenNxCloudPanel = "ShowOpenNxCloudPanel"
    const val ShowConnectNxCloudPanel = "ShowConnectNxCloudPanel"
}

sealed interface MainContentEvents : Event {
    class ShowNoNodeInterpreter : MainContentEvents
    class ShowErrors(override val data: Int) : DataEvent<Int>, MainContentEvents
    class ShowNoProject : MainContentEvents
    class ShowProjectTree(override val data: NxWorkspace) :
        DataEvent<NxWorkspace>, MainContentEvents
}

sealed interface NxCloudEvents : Event {
    class ShowConnectToNxCloud : NxCloudEvents
    class ShowOpenNxCloud(override val data: String) : DataEvent<String>, NxCloudEvents
}

class NxToolWindowPanel(private val project: Project) : SimpleToolWindowPanel(true, true) {

    private val projectTree = NxProjectsTree(project)
    private val projectStructure = NxTreeStructure(projectTree, project)

    private val projectTreeComponent = ScrollPaneFactory.createScrollPane(projectTree, 0)
    private val nxToolMainComponents = NxToolMainComponents(project)
    private val toolBar = createToolbar()
    private var mainContent: JComponent? = null
    private var errorCountAndComponent: Pair<Int, JComponent>? = null
    private var openNxCloudPanel: JPanel? = null
    private var connectToNxCloudPanel: JPanel? = null

    private lateinit var stateMachine: StateMachine

    init {
        val scope: CoroutineScope = ProjectLevelCoroutineHolderService.getInstance(project).cs
        scope.launch {
            stateMachine =
                createStateMachine(scope, childMode = ChildMode.PARALLEL, start = true) {
                    state(States.MainContent) {
                        val noNodeInterpreter =
                            state(MainContentStates.NoNodeInterpreter) {
                                onEntry {
                                    mainContent =
                                        nxToolMainComponents.createNoNodeInterpreterComponent()
                                }
                            }

                        val showError =
                            dataState<Int>(MainContentStates.ShowErrors) {
                                onEntry {
                                    val errorCount = data
                                    mainContent =
                                        errorCountAndComponent.let { components ->
                                            if (
                                                components == null || components.first != errorCount
                                            ) {
                                                val newPair =
                                                    Pair(
                                                        errorCount,
                                                        nxToolMainComponents.createErrorComponent(
                                                            errorCount
                                                        )
                                                    )
                                                errorCountAndComponent = newPair
                                                newPair.second
                                            } else {
                                                components.second
                                            }
                                        }
                                }
                            }

                        val showNoProject =
                            state(MainContentStates.ShowNoProject) {
                                onEntry {
                                    mainContent = nxToolMainComponents.createNoProjectsComponent()
                                }
                            }

                        val showProjectTree =
                            dataState<NxWorkspace>(MainContentStates.ShowProjectTree) {
                                onEntry {
                                    mainContent = projectTreeComponent
                                    projectStructure.updateNxProjects(data)
                                }
                            }

                        initialState(MainContentStates.InitialLoading) {
                            onEntry {
                                println("show spinner")
                                mainContent = nxToolMainComponents.createSpinner()
                                loadToolwindowContent(this@createStateMachine)
                            }

                            transition<MainContentEvents.ShowNoNodeInterpreter> {
                                targetState = noNodeInterpreter
                            }
                            transition<MainContentEvents.ShowNoProject> {
                                targetState = showNoProject
                            }
                            dataTransition<MainContentEvents.ShowErrors, Int> {
                                targetState = showError
                            }
                            dataTransition<MainContentEvents.ShowProjectTree, NxWorkspace> {
                                targetState = showProjectTree
                            }
                        }
                    }

                    state(States.NxCloud) {
                        val showOpenNxCloudPanel =
                            dataState<String>(NxCloudStates.ShowOpenNxCloudPanel) {
                                onEntry {
                                    openNxCloudPanel?.let { panel -> panel.isVisible = true }
                                        ?: run {
                                            openNxCloudPanel =
                                                nxToolMainComponents.createOpenNxCloudPanel(data)
                                        }
                                    connectToNxCloudPanel?.let { panel -> panel.isVisible = false }
                                }
                            }

                        val showConnectNxCloudPanel =
                            state(NxCloudStates.ShowConnectNxCloudPanel) {
                                onEntry {
                                    connectToNxCloudPanel?.let { panel -> panel.isVisible = true }
                                        ?: run {
                                            connectToNxCloudPanel =
                                                nxToolMainComponents.createConnectToNxCloudPanel(
                                                    nxConnectActionListener
                                                )
                                        }
                                    openNxCloudPanel?.let { panel -> panel.isVisible = false }
                                }
                            }

                        initialState(NxCloudStates.InitializeNxCloud) {
                            transition<NxCloudEvents.ShowConnectToNxCloud> {
                                targetState = showConnectNxCloudPanel
                            }
                            dataTransition<NxCloudEvents.ShowOpenNxCloud, String> {
                                targetState = showOpenNxCloudPanel
                            }
                        }
                    }

                    addListener(
                        object : StateMachine.Listener {
                            override suspend fun onStateEntry(
                                state: IState,
                                transitionParams: TransitionParams<*>
                            ) {
                                setContent(showContentWithCloud())
                            }
                        }
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
                } else if (workspace == null || workspace.projectGraph.nodes.isEmpty()) {
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

    private fun showContentWithCloud(): JComponent {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            mainContent?.let { add(mainContent) }
            add(Box.createVerticalGlue())
            openNxCloudPanel?.let { add(openNxCloudPanel) }
            connectToNxCloudPanel?.let { add(connectToNxCloudPanel) }
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

class NxToolMainComponents(private val project: Project) {
    fun createNoProjectsComponent(): JComponent {
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
                                    override fun actionPerformed(e: ActionEvent?) {
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

    fun createErrorComponent(errorCount: Int): JComponent {
        return panel {
            indent {
                row {
                    text(
                        "<h3> Nx caught ${if (errorCount == 1) "an error" else "$errorCount errors"} while computing the project graph.</h3>"
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
                        when (it.description) {
                            "refresh" -> {
                                NxRefreshWorkspaceService.getInstance(project).refreshWorkspace()
                            }
                            "open-idea-log" -> {
                                val action = ActionManager.getInstance().getAction("OpenLog")

                                val dataContext =
                                    SimpleDataContext.getSimpleContext(
                                        CommonDataKeys.PROJECT,
                                        project
                                    )

                                ActionUtil.invokeAction(
                                    action,
                                    dataContext,
                                    NxToolWindowPanel.NX_TOOLBAR_PLACE,
                                    null,
                                    null,
                                )
                            }
                            else -> {
                                BrowserLauncher.instance.browse(URI.create(it.description))
                            }
                        }
                    }
                }
            }
        }
    }

    fun createNoNodeInterpreterComponent(): JComponent {
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
                                    override fun actionPerformed(e: ActionEvent?) {
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

    fun createSpinner(): JProgressBar {
        return JProgressBar().apply {
            isIndeterminate = true // Makes it animate continuously
            border = BorderFactory.createEmptyBorder(10, 10, 10, 10)
        }
    }

    fun createOpenNxCloudPanel(nxCloudUrl: String): JPanel {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.X_AXIS)
            border =
                CompoundBorder(
                    JBUI.Borders.empty(0, 10),
                    BorderFactory.createMatteBorder(
                        1,
                        0,
                        0,
                        0,
                        JBColor.border(),
                    ),
                )

            add(JLabel().apply { icon = AllIcons.RunConfigurations.TestPassed })
            add(Box.Filler(Dimension(5, 0), Dimension(5, 0), Dimension(5, 0)))
            add(
                JLabel("Connected to Nx Cloud").apply {
                    font = Font(font.name, Font.BOLD, font.size)
                    alignmentX = Component.LEFT_ALIGNMENT
                }
            )
            add(Box.createHorizontalGlue())
            add(
                JButton().apply {
                    icon = AllIcons.ToolbarDecorator.Export
                    toolTipText = "Open Nx Cloud"

                    isContentAreaFilled = false
                    isBorderPainted = false
                    isFocusPainted = false
                    cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
                    addActionListener {
                        TelemetryService.getInstance(project)
                            .featureUsed(TelemetryEvent.CLOUD_OPEN_APP)
                        BrowserLauncher.instance.browse(URI.create(nxCloudUrl))
                    }
                }
            )
        }
    }

    fun createConnectToNxCloudPanel(nxConnectActionListener: ActionListener): JPanel {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            border =
                CompoundBorder(
                    BorderFactory.createMatteBorder(1, 0, 0, 0, JBColor.border()),
                    JBUI.Borders.empty(5, 10, 0, 10),
                )

            add(
                JLabel("You're not connected to Nx Cloud.").apply {
                    alignmentX = Component.CENTER_ALIGNMENT
                    font = Font(font.name, Font.BOLD, font.size)
                }
            )

            add(Box.createVerticalStrut(5))

            add(
                JPanel().apply {
                    maximumSize = Dimension(Short.MAX_VALUE.toInt(), 100)
                    layout = FlowLayout(FlowLayout.CENTER, 5, 5)
                    add(
                        JButton("Connect to Nx Cloud").apply {
                            addActionListener(nxConnectActionListener)
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )

                    add(
                        HyperlinkLabel("Learn more about Nx Cloud").apply {
                            icon = null
                            maximumSize = preferredSize
                            setHyperlinkTarget("https://nx.app?utm_source=nxconsole")
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )
                }
            )
        }
    }
}
