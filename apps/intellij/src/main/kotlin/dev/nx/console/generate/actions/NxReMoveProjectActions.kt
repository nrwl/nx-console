package dev.nx.console.generate.actions

import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import dev.nx.console.generate.NxGenerateService
import dev.nx.console.generate.NxReMoveProjectDialog
import dev.nx.console.generate.run_generator.RunGeneratorManager
import dev.nx.console.models.WorkspaceLayout
import dev.nx.console.nxls.NxlsService
import dev.nx.console.telemetry.TelemetryService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

open class NxReMoveProjectActionBase(val mode: String) : AnAction() {
    init {
        require(mode == "move" || mode == "remove")
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project).featureUsed("Nx $mode")

        val path =
            if (ActionPlaces.isPopupPlace(e.place)) {
                e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path
            } else {
                null
            }

        CoroutineScope(Dispatchers.Default).launch { selectOptionsAndRun(path, project) }
    }

    private suspend fun selectOptionsAndRun(path: String?, project: Project) {
        val nxlsService = project.service<NxlsService>()

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

        val moveGeneratorContext = path?.let { nxlsService.generatorContextFromPath(path = path) }

        val runGeneratorManager = RunGeneratorManager(project)

        ApplicationManager.getApplication().invokeLater {
            val dialog =
                NxReMoveProjectDialog(
                    project,
                    mode,
                    moveGenerators,
                    moveGeneratorContext,
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

class NxMoveProjectAction() : NxReMoveProjectActionBase("move") {}

class NxRemoveProjectAction() : NxReMoveProjectActionBase("remove") {}
