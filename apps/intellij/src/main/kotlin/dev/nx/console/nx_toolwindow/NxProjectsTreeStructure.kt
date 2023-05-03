package dev.nx.console.nx_toolwindow

import com.intellij.execution.Executor
import com.intellij.execution.RunManager
import com.intellij.execution.RunnerAndConfigurationSettings
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
import dev.nx.console.run.NxCommandConfiguration
import dev.nx.console.run.NxCommandConfigurationType
import dev.nx.console.run.NxRunSettings
import dev.nx.console.run.NxTaskExecutionManager
import dev.nx.console.utils.nxWorkspace
import java.awt.event.MouseEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch

class NxProjectsTreeStructure(
    val nxTaskExecutionManager: NxTaskExecutionManager,
    val tree: NxProjectsTree,
    val project: Project,
    nxWorkspace: NxWorkspace?
) : SimpleTreeStructure() {

    private val treeModel = StructureTreeModel(this, project)
    private var root: NxSimpleNode.Root = NxSimpleNode.Root(nxWorkspace)
    private var treePersistenceManager = NxProjectsTreePersistenceManager(tree)

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
                val nxTarget = taskSet.nxTargets.first()
                val nxProject = taskSet.nxProjects.first()
                val runnerAndConfigurationSettings: RunnerAndConfigurationSettings =
                    runManager
                        .getConfigurationSettingsList(NxCommandConfigurationType.getInstance())
                        .firstOrNull {
                            val nxCommandConfiguration = it.configuration as NxCommandConfiguration
                            val nxRunSettings = nxCommandConfiguration.nxRunSettings
                            nxRunSettings.nxTargets == nxTarget &&
                                nxRunSettings.nxProjects == nxProject
                        }
                        ?: runManager
                            .createConfiguration(
                                "$nxProject[$nxTarget]",
                                NxCommandConfigurationType::class.java
                            )
                            .apply {
                                (configuration as NxCommandConfiguration).apply {
                                    nxRunSettings =
                                        NxRunSettings(
                                            nxProjects = nxProject,
                                            nxTargets = nxTarget,
                                        )
                                }
                            }

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
                            taskSet.nxProjects.first(),
                            taskSet.nxTargets.first()
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
            val project = e.project ?: return
            val taskSet: NxTaskSet? = createTaskSetFromSelectedNodes()
            if (taskSet != null) {
                nxTaskExecutionManager.execute(
                    taskSet.nxProjects.first(),
                    taskSet.nxTargets.first()
                )
            }
        }
    }

    private fun createTaskSetFromSelectedNodes(): NxTaskSet? {
        val userObject = tree.selectedNode as? NxSimpleNode.Target
        if (userObject != null) {
            return NxTaskSet(
                nxProjects = listOf(userObject.nxProjectName),
                nxTargets = listOf(userObject.nxTargetName)
            )
        }
        return null
    }
}
