package dev.nx.console.toolWindow

import com.intellij.execution.Executor
import com.intellij.execution.RunManager
import com.intellij.execution.RunnerAndConfigurationSettings
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.impl.RunDialog
import com.intellij.execution.runners.ExecutionUtil
import com.intellij.icons.AllIcons
import com.intellij.ide.CommonActionsManager
import com.intellij.ide.DefaultTreeExpander
import com.intellij.ide.TreeExpander
import com.intellij.ide.actions.RefreshAction
import com.intellij.ide.actions.runAnything.RunAnythingManager
import com.intellij.lang.javascript.JavaScriptBundle
import com.intellij.openapi.Disposable
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.invokeLater
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.ClickListener
import com.intellij.ui.PopupHandler
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.tree.AsyncTreeModel
import com.intellij.ui.tree.StructureTreeModel
import com.intellij.ui.treeStructure.CachingSimpleNode
import com.intellij.ui.treeStructure.SimpleNode
import com.intellij.ui.treeStructure.SimpleTree
import com.intellij.ui.treeStructure.SimpleTreeStructure
import com.intellij.util.ui.tree.TreeUtil
import dev.nx.console.NxIcons
import dev.nx.console.run.NxCommandConfiguration
import dev.nx.console.run.NxCommandConfigurationType
import dev.nx.console.run.NxRunSettings
import dev.nx.console.services.NxlsService
import java.awt.event.MouseEvent
import javax.swing.JComponent
import javax.swing.tree.TreeSelectionModel
import kotlinx.coroutines.runBlocking

class NxToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val toolwindowPanel = NxToolWindowPanel(project)
        val contentManager = toolWindow.contentManager
        val content = contentManager.factory.createContent(toolwindowPanel, null, false)
        content.isCloseable = false
        contentManager.addContent(content)
    }
}

class NxToolWindowPanel(project: Project) : SimpleToolWindowPanel(true, true) {
    private val nx = NxToolWindow(project)

    init {
        toolbar = nx.toolbar.component
        nx.toolbar.targetComponent = this
        setContent(nx.content)
    }
}

class NxToolWindow(val project: Project) {

    private val projectTree = NxProjectsTree()
    private val projectStructure =
        NxProjectsTreeStructure(NxExecutor(project), projectTree, project, project.nxWorkspace())
    val content: JComponent = ScrollPaneFactory.createScrollPane(projectTree, 0)

    val toolbar: ActionToolbar = run {
        val actionManager = ActionManager.getInstance()
        val actionGroup = DefaultActionGroup()

        val nxRunAnythingAction =
            object :
                AnAction("Execute Nx Tasks", "Execute nx tasks", AllIcons.Actions.Run_anything) {
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
                    invokeLater { projectStructure.updateNxProjects(project.nxWorkspace()) }
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

    init {
        invokeLater { projectStructure.updateNxProjects(project.nxWorkspace()) }
    }

    companion object {
        const val NX_TOOLBAR_PLACE = "Nx Toolbar"
    }
}

class NxProjectsTree : SimpleTree() {
    init {
        isRootVisible = true
        showsRootHandles = true
        emptyText.text = "There are no nx projects to display."
        selectionModel.selectionMode = TreeSelectionModel.SINGLE_TREE_SELECTION
    }
}

data class NxWorkspace(val name: String, val nxProjects: List<NxProject>)

fun Project.nxWorkspace() = runBlocking {
    val workspace = service<NxlsService>().workspace()?.get("workspace")
    val nxName = workspace?.asJsonObject?.get("npmScope")?.asString ?: "nx"
    val nxProjects =
        workspace?.asJsonObject?.get("projects")?.asJsonObject?.entrySet()?.map { entry ->
            NxProject(
                name = entry.key,
                projectType = entry.value?.asJsonObject?.get("projectType")?.asString ?: "library",
                targets =
                    entry.value?.asJsonObject?.get("targets")?.asJsonObject?.keySet()?.toList()
                        ?: emptyList(),
            )
        }
            ?: emptyList()
    NxWorkspace(nxName, nxProjects)
}

class NxProjectsTreeStructure(
    val nxExecutor: NxExecutor,
    val tree: NxProjectsTree,
    val parentDisposable: Disposable,
    private var nxWorkspace: NxWorkspace
) : SimpleTreeStructure() {

    private val treeModel = StructureTreeModel(this, parentDisposable)
    private var root: NxSimpleNode.Root = NxSimpleNode.Root(nxWorkspace)

    init {
        tree.model = AsyncTreeModel(treeModel, parentDisposable)
        TreeUtil.installActions(tree)
        installPopupActions()
    }

    override fun getRootElement(): Any = root

    fun updateNxProjects(nxWorkspace: NxWorkspace) {
        this.nxWorkspace = nxWorkspace
        root = NxSimpleNode.Root(nxWorkspace)
        treeModel.invalidate()
    }

    sealed class NxSimpleNode(parent: SimpleNode?) : CachingSimpleNode(parent) {
        class Root(val nxWorkspace: NxWorkspace) : NxSimpleNode(null) {

            init {
                icon = NxIcons.Action
            }

            override fun buildChildren(): Array<SimpleNode> {
                val tasks: Array<SimpleNode> = arrayOf(Tasks(nxWorkspace.nxProjects, this))
                val apps: Array<SimpleNode> = arrayOf(Apps(nxWorkspace.nxProjects, this))
                val libs: Array<SimpleNode> = arrayOf(Libs(nxWorkspace.nxProjects, this))
                return tasks + apps + libs
            }

            override fun getName(): String {
                return nxWorkspace.name
            }
        }

        class Apps(private val nxProjects: List<NxProject>, parent: SimpleNode) :
            NxSimpleNode(null) {

            init {
                icon = AllIcons.Nodes.ModuleGroup
            }

            override fun buildChildren(): Array<SimpleNode> {

                val projects: Array<SimpleNode> =
                    nxProjects
                        .filter { it.projectType == "application" }
                        .map { Project(it, this) }
                        .toTypedArray()
                return projects
            }

            override fun getName(): String {
                return "apps"
            }
        }

        class Libs(private val nxProjects: List<NxProject>, parent: SimpleNode) :
            NxSimpleNode(null) {

            init {
                icon = AllIcons.Nodes.PpLibFolder
            }

            override fun buildChildren(): Array<SimpleNode> {
                val projects: Array<SimpleNode> =
                    nxProjects
                        .filter { it.projectType == "library" }
                        .map { Project(it, this) }
                        .toTypedArray()
                return projects
            }

            override fun getName(): String {
                return "libs"
            }
        }

        class Tasks(private val nxProjects: List<NxProject>, parent: SimpleNode) :
            NxSimpleNode(parent) {
            init {
                icon = AllIcons.Nodes.ConfigFolder
            }

            override fun buildChildren(): Array<SimpleNode> {
                return nxProjects
                    .flatMap { it.targets }
                    .distinct()
                    .map { Task(nxProjects, it, this) }
                    .toTypedArray()
            }

            override fun getName(): String = "Tasks"
        }

        class Task(
            private val nxProjects: List<NxProject>,
            val taskName: String,
            parent: SimpleNode
        ) : NxSimpleNode(parent) {
            init {
                icon = AllIcons.Nodes.ConfigFolder
            }

            override fun buildChildren(): Array<SimpleNode> {
                return nxProjects
                    .filter { it.targets.contains(taskName) }
                    .map {
                        NxTarget(
                            name = it.name,
                            nxProject = it.name,
                            nxTarget = taskName,
                            parent = this
                        )
                    }
                    .toTypedArray()
            }

            override fun getName(): String = taskName
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

            override fun buildChildren(): Array<SimpleNode> {
                return nxProject.targets
                    .map {
                        NxTarget(
                            name = it,
                            nxProject = nxProject.name,
                            nxTarget = it,
                            parent = this
                        )
                    }
                    .toTypedArray()
            }

            override fun getName(): String {
                return nxProject.name
            }
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

data class NxProject(val name: String, val projectType: String, val targets: List<String>)

data class NxTaskSet(val nxProjects: List<String>, val nxTargets: List<String>)

val NxTaskSet.suggestedName
    get() =
        nxProjects.joinToString(separator = ",") + nxTargets.joinToString(separator = ",", "[", "]")

class NxExecutor(val project: Project) {
    fun execute(taskSet: NxTaskSet) {
        val runManager = project.service<RunManager>()
        val nxTarget = taskSet.nxTargets.first()
        val nxProject = taskSet.nxProjects.first()
        val runnerAndConfigurationSettings: RunnerAndConfigurationSettings =
            runManager
                .getConfigurationSettingsList(NxCommandConfigurationType.getInstance())
                .firstOrNull {
                    val nxCommandConfiguration = it.configuration as NxCommandConfiguration
                    val nxRunSettings = nxCommandConfiguration.nxRunSettings
                    nxRunSettings.nxTargets == nxTarget && nxRunSettings.nxProjects == nxProject
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
                    .also { runManager.addConfiguration(it) }
        runManager.selectedConfiguration = runnerAndConfigurationSettings
        val executor: Executor = DefaultRunExecutor.getRunExecutorInstance()
        ExecutionUtil.runConfiguration(runnerAndConfigurationSettings, executor)
    }
}
