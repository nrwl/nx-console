package dev.nx.console.nx_toolwindow

import com.intellij.analysis.problemsView.toolWindow.ProblemsView
import com.intellij.icons.AllIcons
import com.intellij.ide.DefaultTreeExpander
import com.intellij.ide.TreeExpander
import com.intellij.ide.actions.RefreshAction
import com.intellij.ide.browsers.BrowserLauncher
import com.intellij.javascript.nodejs.settings.NodeSettingsConfigurable
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
import com.intellij.ui.HyperlinkLabel
import com.intellij.ui.JBColor
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.TreeUIHelper
import com.intellij.ui.dsl.builder.Align
import com.intellij.ui.dsl.builder.panel
import com.intellij.ui.treeStructure.Tree
import com.intellij.util.ui.JBUI
import dev.nx.console.nx_toolwindow.cloud_tree.CIPETreeCellRenderer
import dev.nx.console.nx_toolwindow.cloud_tree.CIPETreeStructure
import dev.nx.console.nx_toolwindow.tree.NxProjectsTree
import dev.nx.console.nxls.NxRefreshWorkspaceService
import dev.nx.console.run.actions.NxInitService
import dev.nx.console.settings.NxConsoleSettingsConfigurable
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import java.awt.*
import java.awt.event.ActionEvent
import java.awt.event.ActionListener
import java.net.URI
import javax.swing.*
import javax.swing.border.CompoundBorder
import javax.swing.tree.DefaultMutableTreeNode

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

    fun createNoNxWorkspacePanel(): JPanel {
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)

            add(
                JPanel().apply {
                    layout = BoxLayout(this, BoxLayout.Y_AXIS)
                    border = BorderFactory.createEmptyBorder(10, 10, 10, 10)
                    isOpaque = false

                    add(
                        JLabel(
                                "<html><h3>No Nx workspace detected.</h3> You can add Nx to this project or manually select the workspace folder to begin.</html>"
                            )
                            .apply { alignmentX = Component.CENTER_ALIGNMENT }
                    )

                    add(Box.createRigidArea(Dimension(0, 20)))

                    add(
                        JLabel("<html>Run Nx Init to add Nx:</html>").apply {
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 4)))

                    add(
                        JButton("Nx Init").apply {
                            alignmentX = Component.CENTER_ALIGNMENT
                            addActionListener { NxInitService.getInstance(project).runNxInit() }
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 20)))

                    add(
                        JLabel("<html>Or manually select your Nx workspace folder:</html>").apply {
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 4)))

                    add(
                        JButton("Select Workspace").apply {
                            alignmentX = Component.CENTER_ALIGNMENT
                            addActionListener {
                                ShowSettingsUtil.getInstance()
                                    .showSettingsDialog(
                                        project,
                                        NxConsoleSettingsConfigurable::class.java,
                                    )
                            }
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 20)))

                    add(
                        JLabel("<html>If you have set up Nx, try refreshing:</html>").apply {
                            alignmentX = Component.CENTER_ALIGNMENT
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 4)))

                    add(
                        JButton("Refresh").apply {
                            alignmentX = Component.CENTER_ALIGNMENT
                            addActionListener {
                                TelemetryService.getInstance(project)
                                    .featureUsed(
                                        TelemetryEvent.MISC_REFRESH_WORKSPACE,
                                        mapOf("source" to TelemetryEventSource.PROJECTS_VIEW),
                                    )
                                NxRefreshWorkspaceService.getInstance(project).refreshWorkspace()
                            }
                        }
                    )

                    add(Box.createRigidArea(Dimension(0, 10)))

                    add(
                        panel {
                            row {
                                text(
                                        "New to Nx? <a href='https://nx.dev/plugin-features/use-code-generators'>Use generators</a> to scaffold projects or <a href='https://nx.dev/reference/project-configuration'>configure them manually</a>. " +
                                            "If your workspace isn't at the project root, set the <a href='open-setting'>workspace path</a>."
                                    ) {
                                        if (it.description == "open-setting") {
                                            ShowSettingsUtil.getInstance()
                                                .showSettingsDialog(
                                                    project,
                                                    NxConsoleSettingsConfigurable::class.java
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
                                .tryToExecute(
                                    action,
                                    null,
                                    null,
                                    NxToolWindowPanel.NX_TOOLBAR_PLACE,
                                    true
                                )
                        } else {
                            BrowserLauncher.instance.browse(URI.create(it.description))
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
                                        TelemetryService.getInstance(project)
                                            .featureUsed(
                                                TelemetryEvent.MISC_REFRESH_WORKSPACE,
                                                mapOf(
                                                    "source" to TelemetryEventSource.PROJECTS_VIEW
                                                ),
                                            )
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

    fun createConnectedToNxCloudPanel(nxCloudUrl: String): JPanel {
        return JPanel().apply {
            layout = BorderLayout()
            border = BorderFactory.createMatteBorder(1, 0, 0, 0, JBColor.border())

            // Header panel with connection status
            val headerPanel =
                JPanel().apply {
                    layout = BoxLayout(this, BoxLayout.X_AXIS)
                    border = JBUI.Borders.empty(5, 10)

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

            add(headerPanel, BorderLayout.NORTH)

            // Add CIPE tree component
            val cipeTreeComponent = createCIPETreeComponent()
            add(cipeTreeComponent, BorderLayout.CENTER)
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

    fun createToolbar(tree: NxProjectsTree): ActionToolbar {
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

            actionManager.createActionToolbar(NxToolWindowPanel.NX_TOOLBAR_PLACE, actionGroup, true)
        }
    }

    fun createCIPETreeComponent(): JComponent {
        val cipeTreeStructure = CIPETreeStructure(project)
        val treeModel = cipeTreeStructure.createTreeModel()

        val tree =
            Tree(treeModel).apply {
                isRootVisible = false
                cellRenderer = CIPETreeCellRenderer()
                TreeUIHelper.getInstance().installTreeSpeedSearch(this)

                // Auto-expand failed pipelines
                addTreeExpansionListener(
                    object : javax.swing.event.TreeExpansionListener {
                        override fun treeExpanded(event: javax.swing.event.TreeExpansionEvent) {
                            val path = event.path
                            val lastNode = path.lastPathComponent as? DefaultMutableTreeNode
                            val userObject = lastNode?.userObject

                            if (
                                userObject != null && cipeTreeStructure.shouldAutoExpand(userObject)
                            ) {
                                // Expand children that should be auto-expanded
                                for (i in 0 until lastNode.childCount) {
                                    val child = lastNode.getChildAt(i) as? DefaultMutableTreeNode
                                    val childObject = child?.userObject
                                    if (
                                        childObject != null &&
                                            cipeTreeStructure.shouldAutoExpand(childObject)
                                    ) {
                                        expandPath(path.pathByAddingChild(child))
                                    }
                                }
                            }
                        }

                        override fun treeCollapsed(event: javax.swing.event.TreeExpansionEvent) {}
                    }
                )
            }

        return ScrollPaneFactory.createScrollPane(tree, 0).apply {
            preferredSize = Dimension(300, 400)
            minimumSize = Dimension(200, 200)
        }
    }
}
