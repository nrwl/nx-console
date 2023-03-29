package dev.nx.console.generate

import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.util.ui.JBUI
import dev.nx.console.generate.ui.DefaultNxGenerateUiFile
import dev.nx.console.generate.ui.NxGeneratorListCellRenderer
import dev.nx.console.models.NxGenerator
import dev.nx.console.models.NxGeneratorOption
import dev.nx.console.nxls.server.requests.NxGeneratorOptionsRequestOptions
import dev.nx.console.services.NxlsService
import dev.nx.console.utils.nxlsWorkingPath
import java.awt.Dimension
import javax.swing.ListSelectionModel.SINGLE_SELECTION
import kotlinx.coroutines.runBlocking

class NxGenerateService(val project: Project) {

    suspend fun selectGenerator(
        actionEvent: AnActionEvent?,
        callback: (generator: NxGenerator?) -> Unit
    ) {
        val nxlsService = project.service<NxlsService>()

        val generators = nxlsService.generators()

        if (generators.isEmpty()) {
            callback(null)
        }
        val generatorNames = generators.map { it.name }

        if (generatorNames.size == 1) {
            val chosenGenerator = generators.find { g -> g.name == generatorNames[0] }
            callback(chosenGenerator)
        }

        val popup =
            JBPopupFactory.getInstance()
                .createPopupChooserBuilder(generators)
                .setRenderer(NxGeneratorListCellRenderer())
                .setTitle("Nx Generate (UI)")
                .setSelectionMode(SINGLE_SELECTION)
                .setRequestFocus(true)
                .setFilterAlwaysVisible(true)
                .setResizable(true)
                .setMovable(true)
                .setNamerForFiltering { "${it.data.collection} - ${it.data.name}" }
                .setItemChosenCallback { chosen ->
                    if (chosen != null) {
                        callback(chosen)
                    }
                }
                .setMinSize(Dimension(JBUI.scale(350), JBUI.scale(300)))
                .setDimensionServiceKey("nx.dev.console.generate")
                .createPopup()

        if (actionEvent?.dataContext != null) {
            popup.showInBestPositionFor(actionEvent.dataContext)
        } else {
            popup.showInFocusCenter()
        }
    }

    fun openGenerateUi(
        project: Project,
        generator: NxGenerator,
        contextPath: String? = null,
        options: List<NxGeneratorOption>? = null
    ) {

        val generatorOptions =
            options
                ?: runBlocking {
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

        val generatorWithOptions = NxGenerator(generator, generatorOptions)

        val generatorContext =
            contextPath?.let {
                runBlocking {
                    project
                        .service<NxlsService>()
                        .generatorContextFromPath(generatorWithOptions, nxlsWorkingPath(contextPath))
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

    companion object {
        fun getInstance(project: Project): NxGenerateService =
            project.getService(NxGenerateService::class.java)
    }
}
