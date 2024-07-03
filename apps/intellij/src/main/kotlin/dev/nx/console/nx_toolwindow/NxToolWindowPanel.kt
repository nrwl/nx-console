package dev.nx.console.nx_toolwindow

import com.intellij.icons.AllIcons
import com.intellij.ide.DefaultTreeExpander
import com.intellij.ide.TreeExpander
import com.intellij.ide.actions.RefreshAction
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.invokeLater
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.OnePixelDivider
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.ui.JBSplitter
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.SideBorder
import com.intellij.ui.dsl.builder.Align
import com.intellij.ui.dsl.builder.panel
import dev.nx.console.nx_toolwindow.tree.NxProjectsTree
import dev.nx.console.nx_toolwindow.tree.NxTreeStructure
import dev.nx.console.nxls.NxRefreshWorkspaceAction
import dev.nx.console.nxls.NxRefreshWorkspaceService
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.actions.NxConnectAction
import dev.nx.console.settings.NxConsoleSettingsConfigurable
import dev.nx.console.settings.options.NX_TOOLWINDOW_STYLE_SETTING_TOPIC
import dev.nx.console.settings.options.NxToolWindowStyleSettingListener
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import java.awt.BorderLayout
import java.awt.Component
import java.awt.Desktop
import java.awt.Dimension
import javax.swing.*
import javax.swing.event.HyperlinkEvent
import kotlinx.coroutines.launch

class NxToolWindowPanel(private val project: Project) : SimpleToolWindowPanel(true, true) {

    private val projectTree = NxProjectsTree()
    private val projectStructure = NxTreeStructure(projectTree, project)

    private val projectTreeComponent = ScrollPaneFactory.createScrollPane(projectTree, 0)
    private val noProjectsComponent = getNoProjectsComponent()
    private val errorContent = getErrorComponent()

    init {
        installListeners()
        setupToolbar()
        createToolwindowContent()
    }

    private fun createToolwindowContent() {
        if (project.isDisposed) return
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val nxlsService = NxlsService.getInstance(project)
            val workspace = nxlsService.workspace()
            val mainContent =
                if (workspace != null && !workspace.errors.isNullOrEmpty()) {
                    errorContent
                } else if (workspace == null || workspace.workspace.projects.isEmpty()) {
                    noProjectsComponent
                } else {
                    projectTreeComponent
                }

            val cloudStatus = nxlsService.cloudStatus()

            setContent(createContentWithCloud(cloudStatus?.isConnected, mainContent))

            if (workspace != null && mainContent == projectTreeComponent) {
                projectStructure.updateNxProjects(workspace)
            }
        }
    }

    private fun getNoProjectsComponent(): JComponent {
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
                        JEditorPane(
                                "text/html",
                                "If you're just getting started with Nx, you can <a href='https://nx.dev/plugin-features/use-code-generators'>use generators</a> to quickly scaffold new projects or <a href='https://nx.dev/reference/project-configuration'>add them manually</a>.<br/> If your Nx workspace is not at the root of the opened project, make sure to set the <a href='open-setting'>workspace path setting</a>."
                            )
                            .apply {
                                alignmentX = Component.CENTER_ALIGNMENT
                                isEditable = false
                                isOpaque = false
                                addHyperlinkListener { e ->
                                    if (e.eventType == HyperlinkEvent.EventType.ACTIVATED) {
                                        if (e.description == "open-setting") {
                                            ShowSettingsUtil.getInstance()
                                                .showSettingsDialog(
                                                    project,
                                                    NxConsoleSettingsConfigurable::class.java
                                                )
                                            println("Settings dialog opened")
                                        } else {
                                            // Open URL in default browser
                                            Desktop.getDesktop()
                                                .browse(java.net.URI(e.url.toString()))
                                        }
                                    }
                                }
                            }
                    )
                }
            )
        }
    }

    private fun getErrorComponent(): JComponent {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)

            add(
                JPanel().apply {
                    layout = BoxLayout(this, BoxLayout.Y_AXIS)
                    border = BorderFactory.createEmptyBorder(10, 10, 10, 10)

                    add(
                        JLabel(
                                "<html><h3>There was an error loading the Nx workspace.</h3> Please try again.</html>"
                            )
                            .apply { alignmentX = Component.CENTER_ALIGNMENT }
                    )

                    add(Box.createRigidArea(Dimension(0, 10)))

                    add(
                        JButton("Refresh Workspace").apply {
                            action =
                                object : AbstractAction("Refresh Workspace") {
                                    override fun actionPerformed(e: java.awt.event.ActionEvent?) {
                                        NxRefreshWorkspaceService.getInstance(project)
                                            .refreshWorkspace()
                                    }
                                }
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )
                }
            )
        }
    }

    private fun createContentWithCloud(
        isConnectedToCloud: Boolean?,
        mainContent: JComponent
    ): JComponent {
        if (isConnectedToCloud == true || isConnectedToCloud == null) {
            return JPanel().apply {
                layout = BoxLayout(this, BoxLayout.Y_AXIS)
                add(JPanel().apply { add(mainContent) })
                add(Box.createVerticalGlue()) // This will push the footer panel to the bottom
                add(
                    JPanel().apply {
                        layout = BoxLayout(this, BoxLayout.X_AXIS)
                        if (isConnectedToCloud != null) {
                            add(JLabel("Connected to Nx Cloud"))
                        }
                    }
                )
            }
        } else {
            val notConnectedToCloudPanel = panel {
                layout = BorderLayout()
                setBorder(SideBorder(OnePixelDivider.BACKGROUND, SideBorder.TOP))
                indent {
                    row { text("<h3>You're not connected to Nx Cloud.</h3> ") }
                    row { button("Connect to Nx Cloud", NxConnectAction()).align(Align.CENTER) }
                    row { text(NX_CLOUD_LEARN_MORE_TEXT) }
                }
            }
            val splitter = JBSplitter(true, "NxConsole.Toolwindow.Splitter", 0.7f)
            splitter.firstComponent = mainContent
            splitter.secondComponent = notConnectedToCloudPanel
            return splitter
        }
    }

    private fun setupToolbar() {
        val tb = run {
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
        tb.targetComponent = this
        toolbar = tb.component
    }

    private fun installListeners() {
        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener { invokeLater { createToolwindowContent() } }
            )
            subscribe(
                NX_TOOLWINDOW_STYLE_SETTING_TOPIC,
                object : NxToolWindowStyleSettingListener {
                    override fun onNxToolWindowStyleChange() {
                        invokeLater { createToolwindowContent() }
                    }
                }
            )
        }
    }

    companion object {
        const val NX_TOOLBAR_PLACE = "Nx Toolbar"
        private const val NX_CLOUD_LEARN_MORE_TEXT =
            "To learn more about Nx Cloud, check out <a href='https://nx.dev/ci/intro/why-nx-cloud?utm_source=nxconsole'> Why Nx Cloud?</a> or get an overview of <a href='https://nx.dev/ci/features?utm_source=nxconsole'> Nx Cloud features </a>. "
    }
}
