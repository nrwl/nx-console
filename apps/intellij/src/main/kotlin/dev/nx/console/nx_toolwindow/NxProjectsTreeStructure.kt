package dev.nx.console.nx_toolwindow

import com.intellij.execution.Executor
import com.intellij.execution.RunManager
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.impl.RunDialog
import com.intellij.icons.AllIcons
import com.intellij.lang.javascript.JavaScriptBundle
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.ui.ClickListener
import com.intellij.ui.PopupHandler
import com.intellij.ui.tree.AsyncTreeModel
import com.intellij.ui.tree.StructureTreeModel
import com.intellij.ui.treeStructure.SimpleTreeStructure
import com.intellij.util.ui.tree.TreeUtil
import dev.nx.console.graph.actions.NxGraphFocusProjectAction
import dev.nx.console.graph.actions.NxGraphFocusTaskAction
import dev.nx.console.graph.actions.NxGraphFocusTaskGroupAction
import dev.nx.console.models.NxWorkspace
import dev.nx.console.nx_toolwindow.actions.EditNxProjectConfigurationAction
import dev.nx.console.run.*
import dev.nx.console.utils.nxWorkspace
import java.awt.event.MouseEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch

class NxProjectsTreeStructure(
    val tree: NxProjectsTree,
    val project: Project,
    nxWorkspace: NxWorkspace?
) : SimpleTreeStructure() {

    private val treeModel = StructureTreeModel(this, project)
    private var root: NxSimpleNode.Root = NxSimpleNode.Root(nxWorkspace)
    private var treePersistenceManager = NxProjectsTreePersistenceManager(tree)
    private var nxTaskExecutionManager = NxTaskExecutionManager.getInstance(project)

    init {
        tree.model = AsyncTreeModel(treeModel, project)
        TreeUtil.installActions(tree)
        installPopupActions()
        treePersistenceManager.installPersistenceListeners()
    }

    override fun getRootElement(): Any = root

    fun updateNxProjects() {
        val nxWorkspace = project.nxWorkspace()
        root = NxSimpleNode.Root(nxWorkspace)

        CoroutineScope(Dispatchers.Default).launch {
            treeModel.invalidateAsync().await()
            TreeUtil.promiseExpand(tree, treePersistenceManager.NxProjectsTreePersistenceVisitor())
        }
    }

    private inner class RunAction : ExecuteAction(DefaultRunExecutor.getRunExecutorInstance()) {
        init {
            shortcutSet = CommonShortcuts.ENTER
        }
    }

    private inner class EditRunSettingsAction : AnAction(AllIcons.Actions.EditSource), DumbAware {
        override fun getActionUpdateThread(): ActionUpdateThread {
            return ActionUpdateThread.EDT
        }

        override fun update(e: AnActionEvent) {
            val taskSet: NxTaskSet? = createTaskSetFromSelectedNodes()
            e.presentation.isEnabledAndVisible = taskSet != null
            if (taskSet != null) {
                e.presentation.text =
                    JavaScriptBundle.message(
                        "buildTools.EditRunSettingsAction.text",
                        *arrayOf<Any>(taskSet.suggestedName)
                    )
            }
        }

        override fun actionPerformed(e: AnActionEvent) {
            val project = e.project ?: return
            val taskSet: NxTaskSet? = createTaskSetFromSelectedNodes()
            val runManager = project.service<RunManager>()
            if (taskSet != null) {
                val nxTarget = taskSet.nxTarget
                val nxProject = taskSet.nxProject
                val nxTargetConfiguration = taskSet.nxTargetConfiguration
                val runnerAndConfigurationSettings =
                    getOrCreateRunnerConfigurationSettings(
                        project,
                        nxProject,
                        nxTarget,
                        nxTargetConfiguration
                    )

                val ok =
                    RunDialog.editConfiguration(
                        project,
                        runnerAndConfigurationSettings,
                        JavaScriptBundle.message(
                            "dialog.title.edit.run.debug.configuration",
                            *arrayOf<Any>(runnerAndConfigurationSettings.name)
                        )
                    )

                if (ok) {
                    runManager.addConfiguration(runnerAndConfigurationSettings)
                    runManager.selectedConfiguration = runnerAndConfigurationSettings
                }
            }
        }
    }

    private fun installPopupActions() {
        val actionList: MutableList<AnAction> =
            mutableListOf(
                RunAction(),
                EditRunSettingsAction(),
                Separator(),
                EditNxProjectConfigurationAction(),
                NxGraphFocusProjectAction(),
                NxGraphFocusTaskGroupAction(),
                NxGraphFocusTaskAction()
            )

        val copyAction = ActionManager.getInstance().getAction("\$Copy")
        copyAction?.registerCustomShortcutSet(copyAction.shortcutSet, this.tree)
        val copyPathsAction = ActionManager.getInstance().getAction("CopyPaths")
        if (copyPathsAction != null) {
            actionList.add(copyPathsAction)
        }
        val actionGroup = DefaultActionGroup(actionList)
        actionList.forEach { it.registerCustomShortcutSet(it.shortcutSet, tree) }
        PopupHandler.installPopupMenu(this.tree, actionGroup, "NxToolWindow")
        object : ClickListener() {
                override fun onClick(event: MouseEvent, clickCount: Int): Boolean {
                    if (event.button == 1 && clickCount == 2) {
                        val taskSet: NxTaskSet = createTaskSetFromSelectedNodes() ?: return false
                        nxTaskExecutionManager.execute(
                            taskSet.nxProject,
                            taskSet.nxTarget,
                            taskSet.nxTargetConfiguration
                        )
                        return true
                    }
                    return false
                }
            }
            .installOn(this.tree)
    }

    abstract inner class ExecuteAction(executor: Executor) :
        AnAction(executor.startActionText, null as String?, executor.icon), DumbAware {
        private val myExecutor: Executor

        init {
            myExecutor = executor
            this.shortcutSet = CommonShortcuts.ENTER
        }

        override fun getActionUpdateThread(): ActionUpdateThread {
            return ActionUpdateThread.EDT
        }

        override fun update(e: AnActionEvent) {
            val taskSet: NxTaskSet? = createTaskSetFromSelectedNodes()
            e.presentation.isEnabledAndVisible = taskSet != null
            if (taskSet != null) {
                e.presentation.text = myExecutor.getStartActionText(taskSet.suggestedName)
            }
        }

        override fun actionPerformed(e: AnActionEvent) {
            val taskSet: NxTaskSet? = createTaskSetFromSelectedNodes()
            if (taskSet != null) {
                nxTaskExecutionManager.execute(
                    taskSet.nxProject,
                    taskSet.nxTarget,
                    taskSet.nxTargetConfiguration
                )
            }
        }
    }

    private fun createTaskSetFromSelectedNodes(): NxTaskSet? {
        val targetNode = tree.selectedNode as? NxSimpleNode.Target

        if (targetNode != null) {
            return NxTaskSet(
                nxProject = targetNode.nxProjectName,
                nxTarget = targetNode.nxTargetName
            )
        }

        val targetConfigurationNode = tree.selectedNode as? NxSimpleNode.TargetConfiguration

        if (targetConfigurationNode != null) {
            return NxTaskSet(
                nxProject = targetConfigurationNode.nxProjectName,
                nxTarget = targetConfigurationNode.nxTargetName,
                nxTargetConfiguration = targetConfigurationNode.nxTargetConfigurationName
            )
        }

        return null
    }
}
