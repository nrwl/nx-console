package dev.nx.console.generate.actions

import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import dev.nx.console.generate.NxGenerateService
import dev.nx.console.generate.ui.editor.DefaultNxGenerateUiFile
import dev.nx.console.models.NxGenerator
import dev.nx.console.models.NxGeneratorContext
import dev.nx.console.models.NxGeneratorOption
import dev.nx.console.nxls.server.requests.NxGeneratorOptionsRequestOptions
import dev.nx.console.services.NxlsService
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

private val logger = logger<NxGenerateUiAction>()

class NxGenerateUiAction() : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val generateService = project.service<NxGenerateService>()

        val path =
            if (ActionPlaces.isPopupPlace(e.place)) {
                e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path
            } else {
                null
            }

        runBlocking {
            launch {
                generateService.selectGenerator(e) { it?.let { openGenerateUi(project, it, path) } }
            }
        }
    }

    private fun openGenerateUi(project: Project, generator: NxGenerator, contextPath: String?) {
        var generatorOptions: List<NxGeneratorOption> = emptyList()

        runBlocking {
            launch {
                generatorOptions =
                    project
                        .service<NxlsService>()
                        .generatorOptions(
                            NxGeneratorOptionsRequestOptions(
                                generator.data.collection,
                                generator.name,
                                generator.path
                            )
                        )
            }
        }

        val generatorWithOptions = NxGenerator(generator, generatorOptions)

        var generatorContext: NxGeneratorContext? = null
        contextPath?.let {
            runBlocking {
                launch {
                    generatorContext =
                        project
                            .service<NxlsService>()
                            .generatorContextFromPath(generatorWithOptions, contextPath)
                }
            }
        }

        val virtualFile = DefaultNxGenerateUiFile("Generate", project)

        val fileEditorManager = FileEditorManager.getInstance(project)
        if (fileEditorManager.isFileOpen(virtualFile)) {
            fileEditorManager.closeFile(virtualFile)
        }

        fileEditorManager.openFile(virtualFile, true)

        virtualFile.setupGeneratorForm(
            NxGenerator(generator = generatorWithOptions, contextValues = generatorContext)
        )
    }
}
