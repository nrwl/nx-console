package dev.nx.console.nx_toolwindow.tree

import com.intellij.execution.Executor
import com.intellij.execution.RunManager
import com.intellij.execution.executors.DefaultDebugExecutor
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.impl.RunDialog
import com.intellij.icons.AllIcons
import com.intellij.ide.browsers.BrowserLauncher
import com.intellij.lang.javascript.JavaScriptBundle
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.ui.ClickListener
import com.intellij.ui.PopupHandler
import com.intellij.ui.tree.AsyncTreeModel
import com.intellij.ui.tree.StructureTreeModel
import com.intellij.ui.treeStructure.NullNode
import com.intellij.ui.treeStructure.SimpleNode
import com.intellij.ui.treeStructure.SimpleTreeStructure
import com.intellij.util.ui.tree.TreeUtil
import dev.nx.console.models.NxWorkspace
import dev.nx.console.nx_toolwindow.tree.builder.NxFolderTreeBuilder
import dev.nx.console.nx_toolwindow.tree.builder.NxListTreeBuilder
import dev.nx.console.nx_toolwindow.tree.builder.NxTreeBuilderBase
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.*
import dev.nx.console.settings.NxConsoleProjectSettingsProvider
import dev.nx.console.settings.options.ToolWindowStyles
import dev.nx.console.utils.NxConsolePluginDisposable
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import java.awt.event.MouseEvent
import java.net.URI
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class NxTreeStructure(val tree: NxProjectsTree, val project: Project) : SimpleTreeStructure() {

    private val treeModel = StructureTreeModel(this, NxConsolePluginDisposable.getInstance(project))
    private lateinit var nxTreeBuilder: NxTreeBuilderBase
    private var root: SimpleNode = NullNode()

    private var treePersistenceManager = NxTreePersistenceManager(tree)
    private var nxTaskExecutionManager = NxTaskExecutionManager.getInstance(project)

    init {
        tree.model = AsyncTreeModel(treeModel, NxConsolePluginDisposable.getInstance(project))
        TreeUtil.installActions(tree)
        installPopupActions()
        treePersistenceManager.installPersistenceListeners()
    }

    override fun getRootElement(): Any = root

    fun updateNxProjects(nxWorkspace: NxWorkspace) {
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            nxTreeBuilder = getTreeBuilder(nxWorkspace)
            root = nxTreeBuilder.buildRootNode()
            withContext(Dispatchers.EDT) {
                treeModel.invalidateAsync().thenRun {
                    TreeUtil.promiseExpand(
                        tree,
                        treePersistenceManager.NxProjectsTreePersistenceVisitor(),
                    )
                }
            }
        }
    }

    private suspend fun getTreeBuilder(nxWorkspace: NxWorkspace?): NxTreeBuilderBase {
        val toolWindowStyle: ToolWindowStyles =
            NxConsoleProjectSettingsProvider.getInstance(project).toolwindowStyle
        val numProjects = nxWorkspace?.workspace?.projects?.size ?: 1
        return if (
            toolWindowStyle == ToolWindowStyles.LIST ||
                (toolWindowStyle == ToolWindowStyles.AUTOMATIC && numProjects < 10)
        ) {
            NxListTreeBuilder(nxWorkspace)
        } else {
            val nxFolderTreeData = NxlsService.getInstance(project).projectFolderTree()
            NxFolderTreeBuilder(nxWorkspace, nxFolderTreeData)
        }
    }

    // Tree Node Actions
    private fun installPopupActions() {
        val actionManager = ActionManager.getInstance()

        val nxConnectAction = actionManager.getAction("dev.nx.console.run.actions.NxConnectAction")
        val actionList: MutableList<AnAction> =
            mutableListOf(
                RunAction(),
                RunWithDebugAction(),
                EditRunSettingsAction(),
                LearnMoreAboutAtomizerAction(),
                nxConnectAction,
                Separator(),
                actionManager.getAction("dev.nx.console.ide.ShowNxProjectConfigurationAction"),
                actionManager.getAction("dev.nx.console.graph.actions.NxGraphFocusProjectAction"),
                actionManager.getAction("dev.nx.console.graph.actions.NxGraphFocusTaskGroupAction"),
                actionManager.getAction("dev.nx.console.graph.actions.NxGraphFocusTaskAction"),
                actionManager.getAction("dev.nx.console.generate.actions.NxMoveProjectAction"),
                actionManager.getAction("dev.nx.console.generate.actions.NxRemoveProjectAction"),
            )

        val copyAction = actionManager.getAction("\$Copy")
        copyAction?.registerCustomShortcutSet(copyAction.shortcutSet, this.tree)
        val copyPathsAction = actionManager.getAction("CopyPaths")
        if (copyPathsAction != null) {
            actionList.add(copyPathsAction)
        }
        val actionGroup = DefaultActionGroup(actionList)
        actionList.forEach { it.registerCustomShortcutSet(it.shortcutSet, tree) }
        PopupHandler.installPopupMenu(this.tree, actionGroup, "NxToolWindow")
        object : ClickListener() {
                override fun onClick(event: MouseEvent, clickCount: Int): Boolean {
                    if (event.button == 1 && clickCount == 2) {
                        val taskSet: NxTaskSet = createTaskSetFromSelectedNode() ?: return false
                        nxTaskExecutionManager.execute(
                            taskSet.nxProject,
                            taskSet.nxTarget,
                            taskSet.nxTargetConfiguration,
                        )
                        return true
                    }
                    return false
                }
            }
            .installOn(this.tree)
    }

    private inner class RunAction : ExecuteAction(DefaultRunExecutor.getRunExecutorInstance()) {

        init {
            registerCustomShortcutSet(CommonShortcuts.ENTER, null)
        }
    }

    private inner class RunWithDebugAction :
        ExecuteAction(DefaultDebugExecutor.getDebugExecutorInstance()) {
        init {
            registerCustomShortcutSet(CommonShortcuts.getCtrlEnter(), null)
        }
    }

    private inner class EditRunSettingsAction : AnAction(AllIcons.Actions.EditSource), DumbAware {
        override fun getActionUpdateThread(): ActionUpdateThread {
            return ActionUpdateThread.BGT
        }

        override fun update(e: AnActionEvent) {
            super.update(e)

            val taskSet: NxTaskSet? = createTaskSetFromSelectedNode()
            e.presentation.isEnabledAndVisible = taskSet != null
            if (taskSet != null) {
                e.presentation.text =
                    JavaScriptBundle.message(
                        "buildTools.EditRunSettingsAction.text",
                        *arrayOf<Any>(taskSet.suggestedName),
                    )
            }

            val targetNode = tree.selectedNode as? NxSimpleNode.Target ?: return
            if (targetNode.nonAtomizedTarget != null) {
                e.presentation.isVisible = false
            }
        }

        override fun actionPerformed(e: AnActionEvent) {
            val project = e.project ?: return
            val taskSet: NxTaskSet? = createTaskSetFromSelectedNode()
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
                        nxTargetConfiguration,
                    )

                val ok =
                    RunDialog.editConfiguration(
                        project,
                        runnerAndConfigurationSettings,
                        JavaScriptBundle.message(
                            "dialog.title.edit.run.debug.configuration",
                            *arrayOf<Any>(runnerAndConfigurationSettings.name),
                        ),
                    )

                if (ok) {
                    runManager.addConfiguration(runnerAndConfigurationSettings)
                    runManager.selectedConfiguration = runnerAndConfigurationSettings
                }
            }
        }
    }

    abstract inner class ExecuteAction(private val executor: Executor) :
        AnAction(executor.startActionText, null as String?, executor.icon), DumbAware {

        init {
            registerCustomShortcutSet(CommonShortcuts.ENTER, null)
        }

        override fun getActionUpdateThread(): ActionUpdateThread {
            return ActionUpdateThread.BGT
        }

        override fun update(e: AnActionEvent) {
            super.update(e)
            val taskSet: NxTaskSet? = createTaskSetFromSelectedNode()
            e.presentation.isEnabledAndVisible = taskSet != null
            if (taskSet != null) {
                e.presentation.text = executor.getStartActionText(taskSet.suggestedName)
            }

            val targetNode = tree.selectedNode as? NxSimpleNode.Target
            if (targetNode?.nonAtomizedTarget != null) {
                e.presentation.isEnabledAndVisible = false
            }
        }

        override fun actionPerformed(e: AnActionEvent) {
            val taskSet: NxTaskSet? = createTaskSetFromSelectedNode()
            if (taskSet != null) {
                nxTaskExecutionManager.execute(
                    taskSet.nxProject,
                    taskSet.nxTarget,
                    taskSet.nxTargetConfiguration,
                    emptyList(),
                    executor,
                )
            }
        }
    }

    private inner class LearnMoreAboutAtomizerAction : AnAction(AllIcons.General.Web), DumbAware {

        override fun getActionUpdateThread() = ActionUpdateThread.EDT

        override fun actionPerformed(e: AnActionEvent) {
            val url = "https://nx.dev/ci/features/split-e2e-tasks?utm_source=nx-console"
            BrowserLauncher.instance.browse(URI.create(url))
        }

        override fun update(e: AnActionEvent) {
            val targetNode = tree.selectedNode as? NxSimpleNode.Target
            e.presentation.text = "Learn More About Atomizer"
            e.presentation.isEnabledAndVisible = targetNode?.nonAtomizedTarget != null
        }
    }

    private fun createTaskSetFromSelectedNode(): NxTaskSet? {
        val targetNode = tree.selectedNode as? NxSimpleNode.Target

        if (targetNode != null) {
            return NxTaskSet(
                nxProject = targetNode.nxProjectName,
                nxTarget = targetNode.nxTargetName,
            )
        }

        val targetConfigurationNode = tree.selectedNode as? NxSimpleNode.TargetConfiguration

        if (targetConfigurationNode != null) {
            return NxTaskSet(
                nxProject = targetConfigurationNode.nxProjectName,
                nxTarget = targetConfigurationNode.nxTargetName,
                nxTargetConfiguration = targetConfigurationNode.nxTargetConfigurationName,
            )
        }

        return null
    }
}

data class NxTaskSet(
    val nxProject: String,
    val nxTarget: String,
    val nxTargetConfiguration: String,
) {
    constructor(nxProject: String, nxTarget: String) : this(nxProject, nxTarget, "") {}

    val suggestedName =
        "${nxProject}:${nxTarget}${if(nxTargetConfiguration.isBlank().not()) ":$nxTargetConfiguration" else ""}"
}
