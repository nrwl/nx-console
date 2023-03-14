package dev.nx.console.toolWindow

import com.intellij.execution.Executor
import com.intellij.execution.RunManager
import com.intellij.execution.RunnerAndConfigurationSettings
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.impl.RunDialog
import com.intellij.icons.AllIcons
import com.intellij.lang.javascript.JavaScriptBundle
import com.intellij.openapi.Disposable
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware
import com.intellij.ui.ClickListener
import com.intellij.ui.PopupHandler
import com.intellij.ui.tree.AsyncTreeModel
import com.intellij.ui.tree.StructureTreeModel
import com.intellij.ui.treeStructure.CachingSimpleNode
import com.intellij.ui.treeStructure.SimpleNode
import com.intellij.ui.treeStructure.SimpleTreeStructure
import com.intellij.util.ui.tree.TreeUtil
import dev.nx.console.NxIcons
import dev.nx.console.models.NxProject
import dev.nx.console.models.NxWorkspace
import dev.nx.console.run.NxCommandConfiguration
import dev.nx.console.run.NxCommandConfigurationType
import dev.nx.console.run.NxRunSettings
import java.awt.event.MouseEvent

class NxProjectsTreeStructure(
    val nxExecutor: NxExecutor,
    val tree: NxProjectsTree,
    val parentDisposable: Disposable,
    private var nxWorkspace: NxWorkspace?
) : SimpleTreeStructure() {

    private val treeModel = StructureTreeModel(this, parentDisposable)
    private var root: NxSimpleNode.Root = NxSimpleNode.Root(nxWorkspace)

    init {
        tree.model = AsyncTreeModel(treeModel, parentDisposable)
        TreeUtil.installActions(tree)
        installPopupActions()
    }

    override fun getRootElement(): Any = root

    fun updateNxProjects(nxWorkspace: NxWorkspace?) {
        this.nxWorkspace = nxWorkspace
        root = NxSimpleNode.Root(nxWorkspace)
        treeModel.invalidate()
    }

    sealed class NxSimpleNode(parent: SimpleNode?) : CachingSimpleNode(parent) {
        class Root(val nxWorkspace: NxWorkspace?) : NxSimpleNode(null) {

            init {
                icon = NxIcons.Action
            }

            override fun buildChildren(): Array<SimpleNode> {
                if (nxWorkspace == null) {
                    return emptyArray()
                }
                val targets: Array<SimpleNode> = arrayOf(Targets(nxWorkspace, this))
                val apps: Array<SimpleNode> = arrayOf(Apps(nxWorkspace, this))
                val libs: Array<SimpleNode> = arrayOf(Libs(nxWorkspace, this))
                return targets + apps + libs
            }

            // TODO do not add a root node or get the name of workspace properly?
            override fun getName(): String =
                nxWorkspace?.workspacePath?.substringAfterLast("/") ?: "nx-workspace"
        }

        class Apps(private val nxWorkspace: NxWorkspace, parent: SimpleNode) : NxSimpleNode(null) {

            init {
                icon = AllIcons.Nodes.ModuleGroup
            }

            override fun buildChildren(): Array<SimpleNode> =
                nxWorkspace.workspace.projects.values
                    .filter { it.projectType == "application" }
                    .map { Project(it, this) }
                    .toTypedArray()

            override fun getName(): String = "apps"
        }

        class Libs(private val nxWorkspace: NxWorkspace, parent: SimpleNode) : NxSimpleNode(null) {

            init {
                icon = AllIcons.Nodes.PpLibFolder
            }

            override fun buildChildren(): Array<SimpleNode> =
                nxWorkspace.workspace.projects.values
                    .filter { it.projectType == "application" }
                    .map { Project(it, this) }
                    .toTypedArray()

            override fun getName(): String = "libs"
        }

        class Targets(private val nxWorkspace: NxWorkspace, parent: SimpleNode) :
            NxSimpleNode(parent) {
            init {
                icon = AllIcons.Nodes.ConfigFolder
            }

            override fun buildChildren(): Array<SimpleNode> =
                nxWorkspace.workspace.projects.values
                    .flatMap { p -> p.targets.keys.map { it to p.name } }
                    .groupBy { it.first }
                    .map { Target(nxWorkspace, it.key, this) }
                    .toTypedArray()

            override fun getName(): String = "Targets"
        }

        class Target(
            private val nxWorkspace: NxWorkspace,
            val targetName: String,
            parent: SimpleNode
        ) : NxSimpleNode(parent) {
            init {
                icon = AllIcons.Nodes.ConfigFolder
            }

            override fun buildChildren(): Array<SimpleNode> =
                nxWorkspace.workspace.projects
                    .filter { it.value.targets.contains(targetName) }
                    .map {
                        NxTarget(
                            name = it.key,
                            nxProject = it.key,
                            nxTarget = targetName,
                            parent = this
                        )
                    }
                    .toTypedArray()

            override fun getName(): String = targetName
        }

        class NxTarget(
            private val name: String,
            val nxProject: String,
            val nxTarget: String,
            parent: SimpleNode
        ) : NxSimpleNode(parent) {
            init {
                icon = AllIcons.General.Gear
            }

            override fun buildChildren(): Array<SimpleNode> = emptyArray()

            override fun getName(): String = name
        }

        class Project(val nxProject: NxProject, parent: SimpleNode) : NxSimpleNode(parent) {

            init {
                icon =
                    if (nxProject.projectType == "application") AllIcons.Nodes.Module
                    else AllIcons.Nodes.PpLib
            }

            override fun buildChildren(): Array<SimpleNode> =
                nxProject.targets.keys
                    .map {
                        NxTarget(
                            name = it,
                            nxProject = nxProject.name,
                            nxTarget = it,
                            parent = this
                        )
                    }
                    .toTypedArray()

            override fun getName(): String = nxProject.name
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
            val project = e.project ?: return
            val taskSet: NxTaskSet? = createTaskSetFromSelectedNodes()
            e.presentation.isEnabledAndVisible = taskSet != null
            if (taskSet != null) {
                e.presentation.setText(
                    JavaScriptBundle.message(
                        "buildTools.EditRunSettingsAction.text",
                        *arrayOf<Any>(taskSet.suggestedName)
                    )
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
            )

        val copyAction = ActionManager.getInstance().getAction("\$Copy")
        copyAction?.registerCustomShortcutSet(copyAction.shortcutSet, this.tree)
        val copyPathsAction = ActionManager.getInstance().getAction("CopyPaths")
        if (copyPathsAction != null) {
            actionList.add(copyPathsAction)
        }
        val actionGroup = DefaultActionGroup(actionList)
        actionList.forEach { it.registerCustomShortcutSet(it.shortcutSet, tree) }
        PopupHandler.installPopupMenu(this.tree, actionGroup, "NxBuildTool")
        object : ClickListener() {
                override fun onClick(event: MouseEvent, clickCount: Int): Boolean {
                    if (event.button == 1 && clickCount == 2) {
                        val taskSet: NxTaskSet = createTaskSetFromSelectedNodes() ?: return false
                        nxExecutor.execute(taskSet)
                        return true
                    }
                    return false
                }
            }
            .installOn(this.tree)
    }

    inner abstract class ExecuteAction(executor: Executor) :
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
            e.project ?: return
            val taskSet: NxTaskSet? = createTaskSetFromSelectedNodes()
            if (taskSet != null) {
                nxExecutor.execute(taskSet)
            }
        }
    }

    private fun createTaskSetFromSelectedNodes(): NxTaskSet? {
        val userObject = tree.selectedNode as? NxSimpleNode.NxTarget
        if (userObject != null) {
            return NxTaskSet(
                nxProjects = listOf(userObject.nxProject),
                nxTargets = listOf(userObject.nxTarget)
            )
        }
        return null
    }
}
