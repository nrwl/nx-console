package dev.nx.console.nx_toolwindow

import com.intellij.analysis.problemsView.toolWindow.ProblemsView
import com.intellij.icons.AllIcons
import com.intellij.icons.ExpUiIcons
import com.intellij.ide.DefaultTreeExpander
import com.intellij.ide.TreeExpander
import com.intellij.ide.actions.RefreshAction
import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.actionSystem.impl.SimpleDataContext
import com.intellij.openapi.application.EDT
import com.intellij.openapi.application.invokeLater
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.ui.HyperlinkLabel
import com.intellij.ui.JBColor
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.dsl.builder.Align
import com.intellij.ui.dsl.builder.panel
import com.intellij.ui.util.maximumHeight
import com.intellij.util.messages.Topic
import dev.nx.console.nx_toolwindow.tree.NxProjectsTree
import dev.nx.console.nx_toolwindow.tree.NxTreeStructure
import dev.nx.console.nxls.NxRefreshWorkspaceAction
import dev.nx.console.nxls.NxRefreshWorkspaceService
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.actions.NxConnectService
import dev.nx.console.settings.NxConsoleSettingsConfigurable
import dev.nx.console.settings.options.NX_TOOLWINDOW_STYLE_SETTING_TOPIC
import dev.nx.console.settings.options.NxToolWindowStyleSettingListener
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import java.awt.*
import java.awt.event.ActionEvent
import java.net.URI
import javax.swing.*
import javax.swing.border.CompoundBorder
import javax.swing.border.EmptyBorder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class NxToolWindowPanel(private val project: Project) : SimpleToolWindowPanel(true, true) {

    private val projectTree = NxProjectsTree()
    private val projectStructure = NxTreeStructure(projectTree, project)

    private val projectTreeComponent = ScrollPaneFactory.createScrollPane(projectTree, 0)
    private val noProjectsComponent = createNoProjectsComponent()
    private val toolBar = createToolbar()
    private var errorCountAndComponent: Pair<Int, JComponent>? = null

    init {
        setToolwindowContent()
        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener { invokeLater { setToolwindowContent() } }
            )
            subscribe(
                NX_TOOLWINDOW_STYLE_SETTING_TOPIC,
                object : NxToolWindowStyleSettingListener {
                    override fun onNxToolWindowStyleChange() {
                        invokeLater { setToolwindowContent() }
                    }
                }
            )
            subscribe(
                ToggleNxCloudViewAction.NX_TOOLWINDOW_CLOUD_VIEW_COLLAPSED_TOPIC,
                object : ToggleNxCloudViewAction.NxToolwindowCloudViewCollapsedListener {
                    override fun onCloudViewCollapsed() {
                        invokeLater { setToolwindowContent() }
                    }
                }
            )
        }
    }

    private fun setToolwindowContent() {
        if (project.isDisposed) return
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val nxlsService = NxlsService.getInstance(project)
            val workspace = nxlsService.workspace()
            val cloudStatus = nxlsService.cloudStatus()

            withContext(Dispatchers.EDT) {
                val hasProjects = workspace?.workspace?.projects?.isNotEmpty() == true
                val mainContent: JComponent =
                    if (
                        workspace?.let {
                            !it.errors.isNullOrEmpty() && (it.isPartial != true || !hasProjects)
                        } == true
                    ) {
                        val errorCount = workspace.errors!!.size
                        errorCountAndComponent.let {
                            if (it == null || it.first != errorCount) {
                                val newPair = Pair(errorCount, createErrorComponent(errorCount))
                                errorCountAndComponent = newPair
                                newPair.second
                            } else {
                                it.second
                            }
                        }
                    } else if (workspace == null || workspace.workspace.projects.isEmpty()) {
                        noProjectsComponent
                    } else {
                        projectTreeComponent
                    }

                setContent(
                    createContentWithCloud(
                        mainContent,
                        cloudStatus?.isConnected,
                        cloudStatus?.nxCloudUrl
                    )
                )

                toolBar.targetComponent = this@NxToolWindowPanel
                toolbar = toolBar.component

                if (workspace != null && mainContent == projectTreeComponent) {
                    projectStructure.updateNxProjects(workspace)
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
                                        // Implement your NxRefreshWorkspaceAction logic here
                                        println("Workspace refreshed")
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
                                                    NxConsoleSettingsConfigurable::class.java
                                                )
                                        } else {
                                            Desktop.getDesktop().browse(URI.create(it.description))
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

                            val dataContext =
                                SimpleDataContext.getSimpleContext(CommonDataKeys.PROJECT, project)
                            val actionEvent =
                                AnActionEvent.createFromDataContext(
                                    NX_TOOLBAR_PLACE,
                                    null,
                                    dataContext
                                )
                            action.actionPerformed(actionEvent)
                        } else {
                            Desktop.getDesktop().browse(URI.create(it.description))
                        }
                    }
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
                        AllIcons.Actions.Refresh
                    ) {
                    override fun getActionUpdateThread() = ActionUpdateThread.BGT

                    override fun update(e: AnActionEvent) {
                        e.presentation.isEnabled = true
                    }

                    override fun actionPerformed(e: AnActionEvent) {
                        NxRefreshWorkspaceAction().actionPerformed(e)
                    }
                }

            val tree = projectStructure.tree
            refreshAction.registerShortcutOn(tree)

            actionGroup.addAction(refreshAction)
            actionGroup.addSeparator()
            actionGroup.add(
                actionManager.getAction("dev.nx.console.run.actions.NxRunAnythingAction")
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

    private fun createContentWithCloud(
        mainContent: JComponent,
        isConnectedToCloud: Boolean?,
        nxCloudUrl: String?
    ): JComponent {
        val cloudPanelCollapsed = getCloudPanelCollapsed(project)
        if (cloudPanelCollapsed) {
            return mainContent
        } else {
            return JPanel().apply {
                layout = BoxLayout(this, BoxLayout.Y_AXIS)
                add(mainContent)
                add(Box.createVerticalGlue())
                if (isConnectedToCloud == true || isConnectedToCloud == null) {
                    add(
                        JPanel().apply {
                            layout = BoxLayout(this, BoxLayout.X_AXIS)
                            if (isConnectedToCloud != null) {
                                border =
                                    CompoundBorder(
                                        EmptyBorder(0, 10, 0, 10),
                                        BorderFactory.createMatteBorder(
                                            1,
                                            0,
                                            0,
                                            0,
                                            JBColor.border()
                                        )
                                    )

                                add(JLabel().apply { icon = ExpUiIcons.Run.TestPassed })
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
                                        icon = ExpUiIcons.General.Export
                                        toolTipText = "Open Nx Cloud"

                                        isContentAreaFilled = false
                                        isBorderPainted = false
                                        isFocusPainted = false
                                        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
                                        addActionListener {
                                            Desktop.getDesktop()
                                                .browse(
                                                    URI.create(nxCloudUrl ?: "https://cloud.nx.app")
                                                )
                                        }
                                    }
                                )
                            }
                        }
                    )
                } else {
                    add(
                        JPanel().apply {
                            layout = BoxLayout(this, BoxLayout.Y_AXIS)
                            border =
                                CompoundBorder(
                                    BorderFactory.createMatteBorder(1, 0, 0, 0, JBColor.border()),
                                    EmptyBorder(5, 10, 0, 10)
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
                                    maximumHeight = 100
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
                                            maximumSize = getPreferredSize()
                                            setHyperlinkTarget(
                                                "https://nx.app?utm_source=nxconsole"
                                            )
                                            alignmentX = Component.CENTER_ALIGNMENT
                                        }
                                    )
                                }
                            )
                        }
                    )
                }
            }
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
            !NxToolWindowPanel.getCloudPanelCollapsed(project)
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
                NxToolwindowCloudViewCollapsedListener::class.java
            )
    }

    interface NxToolwindowCloudViewCollapsedListener {
        fun onCloudViewCollapsed()
    }
}
