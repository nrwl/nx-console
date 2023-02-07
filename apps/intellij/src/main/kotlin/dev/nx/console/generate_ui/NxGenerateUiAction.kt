package dev.nx.console.generate_ui

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import dev.nx.console.generate_ui.editor.DefaultNxGenerateUiFile
import dev.nx.console.nxls.server.*
import dev.nx.console.services.NxlsService
import javax.swing.ListSelectionModel.SINGLE_SELECTION
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

private val logger = logger<NxGenerateUiAction>()

class NxGenerateUiAction() : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val path = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path

        runBlocking { launch { selectGenerator(project, path, e) } }
    }

    private suspend fun selectGenerator(project: Project, path: String?, e: AnActionEvent) {
        val nxlsService = project.service<NxlsService>()

        val generators = nxlsService.generators()
        val generatorNames = generators.map { it.name }

        JBPopupFactory.getInstance()
            .createPopupChooserBuilder(generatorNames)
            .setTitle("Nx Generate (UI)")
            .setSelectionMode(SINGLE_SELECTION)
            .setRequestFocus(true)
            .setFilterAlwaysVisible(true)
            .setResizable(true)
            .setMovable(true)
            .setNamerForFiltering { it }
            .setItemChosenCallback { chosen ->
                val chosenGenerator = generators.find { g -> g.name == chosen }
                if (chosenGenerator != null) {
                    openGenerateUi(project, chosenGenerator, path)
                }
            }
            .createPopup()
            .showInBestPositionFor(e.dataContext)
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

        val virtualFile = DefaultNxGenerateUiFile("Generate")

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
