package dev.nx.console.nx_toolwindow

import com.intellij.icons.AllIcons
import com.intellij.ide.CommonActionsManager
import com.intellij.ide.DefaultTreeExpander
import com.intellij.ide.TreeExpander
import com.intellij.ide.actions.RefreshAction
import com.intellij.ide.actions.runAnything.RunAnythingManager
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.invokeLater
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.ui.ScrollPaneFactory
import dev.nx.console.run.NxTaskExecutionManager
import dev.nx.console.services.NxWorkspaceRefreshListener
import dev.nx.console.services.NxlsService.Companion.NX_WORKSPACE_REFRESH_TOPIC
import dev.nx.console.utils.nxWorkspace
import javax.swing.JComponent

class NxToolWindow(val project: Project) {

    private val projectTree = NxProjectsTree()
    private val projectStructure =
        NxProjectsTreeStructure(
            NxTaskExecutionManager(project),
            projectTree,
            project,
            project.nxWorkspace()
        )
    val content: JComponent = ScrollPaneFactory.createScrollPane(projectTree, 0)

    init {
        with(project.messageBus.connect()) {
            subscribe(
                NX_WORKSPACE_REFRESH_TOPIC,
                object : NxWorkspaceRefreshListener {
                    override fun onNxWorkspaceRefresh() {
                        invokeLater { projectStructure.updateNxProjects() }
                    }
                }
            )
        }
    }

    val toolbar: ActionToolbar = run {
        val actionManager = ActionManager.getInstance()
        val actionGroup = DefaultActionGroup()

        val nxRunAnythingAction =
            object :
                AnAction(
                    "Execute Nx Targets",
                    "Execute nx targets",
                    AllIcons.Actions.Run_anything
                ) {
                override fun actionPerformed(e: AnActionEvent) {
                    project.service<RunAnythingManager>().show("nx run", false, e)
                }
            }

        val refreshAction =
            object :
                RefreshAction(
                    "Reload Nx Projects",
                    "Reload nx projects",
                    AllIcons.Actions.Refresh
                ) {
                override fun update(e: AnActionEvent) {
                    e.presentation.isEnabled = true
                }

                override fun actionPerformed(e: AnActionEvent) {
                    invokeLater { projectStructure.updateNxProjects() }
                }
            }

        val tree = projectStructure.tree
        refreshAction.registerShortcutOn(tree)

        actionGroup.addAction(refreshAction)
        actionGroup.addSeparator()
        actionGroup.add(nxRunAnythingAction)
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

    companion object {
        const val NX_TOOLBAR_PLACE = "Nx Toolbar"
    }
}
