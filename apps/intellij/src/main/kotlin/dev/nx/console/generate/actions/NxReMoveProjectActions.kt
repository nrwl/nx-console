package dev.nx.console.generate.actions

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.EDT
import com.intellij.openapi.project.Project
import dev.nx.console.generate.NxGenerateService
import dev.nx.console.generate.NxReMoveProjectDialog
import dev.nx.console.generate.run_generator.RunGeneratorManager
import dev.nx.console.models.WorkspaceLayout
import dev.nx.console.nx_toolwindow.tree.NxSimpleNode
import dev.nx.console.nx_toolwindow.tree.NxTreeNodeKey
import dev.nx.console.nxls.NxlsService
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

open class NxReMoveProjectActionBase(val mode: String) : AnAction() {
    init {
        require(mode == "move" || mode == "remove")
    }

    override fun update(e: AnActionEvent) {
        super.update(e)

        // if we are in the toolwindow tree but not on a project node, hide the action
        val nxTreeNode = e.getData(NxTreeNodeKey) ?: return
        if (nxTreeNode !is NxSimpleNode.Project) {
            e.presentation.isEnabledAndVisible = false
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project).featureUsed("Nx $mode")

        val nxProjectNameFromEventData =
            e.getData(NxTreeNodeKey)?.let {
                if (it is NxSimpleNode.Project) {
                    it.nxProjectName
                } else {
                    null
                }
            }

        val path =
            if (ActionPlaces.isPopupPlace(e.place)) {
                e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path
            } else {
                null
            }

        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val projectName =
                nxProjectNameFromEventData
                    ?: path?.let { NxlsService.getInstance(project).projectByPath(path)?.name }

            selectOptionsAndRun(projectName, project)
        }
    }

    private suspend fun selectOptionsAndRun(preselectedProjectName: String?, project: Project) {
        val nxlsService = NxlsService.getInstance(project)

        val projectsWithType =
            nxlsService
                .workspace()
                ?.workspace
                ?.projects
                ?.entries
                ?.map { entry -> entry.key to (entry.value.projectType) }
                ?.associate { it }

        val workspaceLayoutPair =
            nxlsService.workspace()?.workspaceLayout.let {
                WorkspaceLayout(it?.appsDir, it?.libsDir)
            }

        val generators = NxGenerateService.getInstance(project).getFilteredGenerators()
        val moveGenerators = generators.map { it.name }.filter { it.contains(Regex(":${mode}$")) }

        if (moveGenerators.isEmpty()) {
            throw Exception(
                "No $mode generators found. Make sure that node_modules are installed, or set the root of Nx Console to point to a Nx workspace in editor settings."
            )
        }

        val runGeneratorManager = RunGeneratorManager(project)

        withContext(Dispatchers.EDT) {
            val dialog =
                NxReMoveProjectDialog(
                    project,
                    mode,
                    moveGenerators,
                    preselectedProjectName,
                    projectsWithType,
                    workspaceLayoutPair
                ) {
                    runReMoveGenerator(it, runGeneratorManager, dryRun = true)
                }
            if (dialog.showAndGet()) {
                runReMoveGenerator(dialog, runGeneratorManager)
            }
        }
    }

    private fun runReMoveGenerator(
        dialog: NxReMoveProjectDialog,
        runGeneratorManager: RunGeneratorManager,
        dryRun: Boolean = false
    ) {
        val result = dialog.getResult()
        val args =
            mutableListOf<String>(
                "--projectName=${result.project}",
            )
        if (mode == "move") {
            args.add("--destination=${result.directory}")
        }
        if (dryRun) {
            args.add("--dry-run")
        }
        runGeneratorManager.queueGeneratorToBeRun(result.generator, args)
    }
}

class NxMoveProjectAction() : NxReMoveProjectActionBase("move") {
    override fun update(e: AnActionEvent) {
        super.update(e)
        if (ActionPlaces.isPopupPlace(e.place) || e.place == "NxToolWindow") {
            e.presentation.icon = null
        }
    }
}

class NxRemoveProjectAction() : NxReMoveProjectActionBase("remove") {
    override fun update(e: AnActionEvent) {
        super.update(e)
        if (ActionPlaces.isPopupPlace(e.place) || e.place == "NxToolWindow") {
            e.presentation.icon = AllIcons.Actions.GC
        }
    }
}
