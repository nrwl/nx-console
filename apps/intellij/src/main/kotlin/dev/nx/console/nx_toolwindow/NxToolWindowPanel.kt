package dev.nx.console.nx_toolwindow

import com.intellij.icons.AllIcons
import com.intellij.ide.CommonActionsManager
import com.intellij.ide.DefaultTreeExpander
import com.intellij.ide.TreeExpander
import com.intellij.ide.actions.RefreshAction
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.application.invokeLater
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.dsl.builder.Align
import com.intellij.ui.dsl.builder.panel
import dev.nx.console.nx_toolwindow.tree.NxProjectsTree
import dev.nx.console.nx_toolwindow.tree.NxTreeStructure
import dev.nx.console.nxls.NxRefreshWorkspaceAction
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.settings.NxConsoleSettingsConfigurable
import dev.nx.console.settings.options.NX_TOOLWINDOW_STYLE_SETTING_TOPIC
import dev.nx.console.settings.options.NxToolWindowStyleSettingListener
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.nxWorkspace
import javax.swing.JComponent
import kotlinx.coroutines.launch

class NxToolWindowPanel(private val project: Project) : SimpleToolWindowPanel(true, true) {

    private val projectTree = NxProjectsTree()
    private val projectStructure = NxTreeStructure(projectTree, project)

    private val treeContent = ScrollPaneFactory.createScrollPane(projectTree, 0)
    private val emptyContent = getNoProjectsPanel()

    init {
        installListeners()
        setupToolbar()
        createToolwindowContent()
    }

    private fun createToolwindowContent() {
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val workspace = project.nxWorkspace()
            if (workspace == null || workspace.workspace.projects.isEmpty()) {
                setContent(emptyContent)
            } else {
                setContent(treeContent)
                projectStructure.updateNxProjects(workspace)
            }
        }
    }

    private fun getNoProjectsPanel(): JComponent {
        return panel {
            indent {
                row {
                    text(
                        "<h3>We couldn't find any projects in this workspace.</h3> Make sure that the proper dependencies are installed locally and refresh the workspace."
                    )
                }
                row {
                    button("Refresh Workspace", NxRefreshWorkspaceAction(), NX_TOOLBAR_PLACE)
                        .align(Align.CENTER)
                }
                row {
                    text(
                        "If you're just getting started with Nx, you can <a href='https://nx.dev/plugin-features/use-code-generators'>use generators</a> to quickly scaffold new projects or <a href='https://nx.dev/reference/project-configuration'>add them manually</a>." +
                            "<br/> If your Nx workspace is not at the root of the opened project, make sure to set the <a href='open-setting'>workspace path setting</a>."
                    ) {
                        if (it.description.equals("open-setting")) {
                            ShowSettingsUtil.getInstance()
                                .showSettingsDialog(
                                    project,
                                    NxConsoleSettingsConfigurable::class.java
                                )
                        }
                    }
                }
            }
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
            val actions = CommonActionsManager.getInstance()

            val expandAllAction = actions.createExpandAllAction(expander, tree)
            expandAllAction.templatePresentation.setIcon(AllIcons.Actions.Expandall)

            val collapseAllAction = actions.createCollapseAllAction(expander, tree)
            collapseAllAction.templatePresentation.setIcon(AllIcons.Actions.Collapseall)

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
    }
}
