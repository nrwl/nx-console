package dev.nx.console.generate.actions

import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import dev.nx.console.generate.NxReMoveProjectDialog
import dev.nx.console.generate.run_generator.RunGeneratorManager
import dev.nx.console.models.WorkspaceLayout
import dev.nx.console.services.NxlsService
import kotlinx.coroutines.runBlocking

open class NxReMoveProjectActionBase(val mode: String) : AnAction() {
    init {
        require(mode == "move" || mode == "remove")
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val path =
            if (ActionPlaces.isPopupPlace(e.place)) {
                e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path
            } else {
                null
            }

        runBlocking { selectOptionsAndRun(path, project) }
    }

    // TODO: fix autocomplete, add additional options
    private suspend fun selectOptionsAndRun(path: String?, project: Project) {
        val nxlsService = project.service<NxlsService>()

        val projectsWithType =
            nxlsService
                .workspace()
                ?.get("workspace")
                ?.asJsonObject
                ?.get("projects")
                ?.asJsonObject
                ?.entrySet()
                ?.map { entry ->
                    entry.key to (entry.value?.asJsonObject?.get("projectType")?.asString ?: "")
                }
                ?.associate { it }

        val workspaceLayoutPair =
            nxlsService.workspace()?.get("workspaceLayout")?.asJsonObject?.let {
                WorkspaceLayout(it?.get("appsDir")?.asString, it?.get("libsDir")?.asString)
            }

        val generators = nxlsService.generators()
        val moveGenerators = generators.map { it.name }.filter { it.contains(Regex(":${mode}$")) }
        val moveGeneratorContext = path?.let { nxlsService.generatorContextFromPath(path = path) }

        val runGeneratorManager = RunGeneratorManager(project)

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
