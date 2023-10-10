package dev.nx.console.generate

import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.util.ui.JBUI
import dev.nx.console.generate.ui.DefaultNxGenerateUiFile
import dev.nx.console.generate.ui.NxGeneratorListCellRenderer
import dev.nx.console.generate.ui.V2NxGenerateUiFile
import dev.nx.console.models.NxGenerator
import dev.nx.console.models.NxGeneratorOption
import dev.nx.console.nxls.server.requests.NxGeneratorOptionsRequestOptions
import dev.nx.console.services.NxlsService
import dev.nx.console.settings.NxConsoleProjectSettingsProvider
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.settings.options.GeneratorFilter
import dev.nx.console.utils.nxlsWorkingPath
import java.awt.Dimension
import javax.swing.ListSelectionModel.SINGLE_SELECTION
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class NxGenerateService(val project: Project) {

    suspend fun getFilteredGenerators(): List<NxGenerator> {
        val generators = NxlsService.getInstance(project).generators()
        val filters =
            NxConsoleProjectSettingsProvider.getInstance(project).generatorFilters
                ?: return generators
        val includeFilters = mutableListOf<GeneratorFilter>()
        val excludeFilters = mutableListOf<GeneratorFilter>()
        filters.forEach {
            if (it.include) {
                includeFilters.add(it)
            } else {
                excludeFilters.add(it)
            }
        }
        return generators.filter { generator ->
            var keep = true
            if (includeFilters.size > 0) {
                keep =
                    includeFilters.any { filter ->
                        matchWithWildcards(generator.name, filter.matcher)
                    }
            }
            if (excludeFilters.size > 0) {
                keep =
                    keep &&
                        excludeFilters.none { filter ->
                            matchWithWildcards(generator.name, filter.matcher)
                        }
            }
            keep
        }
    }

    suspend fun selectGenerator(
        actionEvent: AnActionEvent?,
    ) = suspendCoroutine {
        CoroutineScope(Dispatchers.Default).launch {
            val generators = getFilteredGenerators()

            if (generators.isEmpty()) {
                it.resume(null)
            }
            val generatorNames = generators.map { it.name }

            if (generatorNames.size == 1) {
                val chosenGenerator = generators.find { g -> g.name == generatorNames[0] }
                it.resume(chosenGenerator)
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
                            it.resume(chosen)
                        }
                    }
                    .setMinSize(Dimension(JBUI.scale(350), JBUI.scale(300)))
                    .setDimensionServiceKey("nx.dev.console.generate")
                    .createPopup()

            ApplicationManager.getApplication().invokeLater {
                if (actionEvent?.dataContext != null) {
                    popup.showInBestPositionFor(actionEvent.dataContext)
                } else {
                    popup.showInFocusCenter()
                }
            }
        }
    }

    suspend fun openGenerateUi(
        project: Project,
        generator: NxGenerator,
        contextPath: String? = null,
        options: List<NxGeneratorOption>? = null
    ) {
        val generatorOptions =
            if (options != null) options
            else {
                val nxProjectNames =
                    project.service<NxlsService>().workspace()?.workspace?.projects?.keys?.toList()
                        ?: emptyList()
                project
                    .service<NxlsService>()
                    .generatorOptions(
                        NxGeneratorOptionsRequestOptions(
                            generator.data.collection,
                            generator.data.name,
                            generator.path
                        )
                    )
                    .map {
                        if (
                            it.name == "project" ||
                                it.name == "projectName" ||
                                it.dropdown == "projects"
                        ) {
                            it.items = nxProjectNames
                        }
                        it
                    }
            }

        val generatorWithOptions = NxGenerator(generator, generatorOptions)

        val generatorContext =
            contextPath?.let {
                project
                    .service<NxlsService>()
                    .generatorContextFromPath(generatorWithOptions, nxlsWorkingPath(contextPath))
            }

        ApplicationManager.getApplication().invokeLater {
            val virtualFile =
                if (NxConsoleSettingsProvider.getInstance().useNewGenerateUIPreview)
                    V2NxGenerateUiFile("Generate", project)
                else DefaultNxGenerateUiFile("Generate", project)

            val fileEditorManager = FileEditorManager.getInstance(project)

            fileEditorManager.openFile(virtualFile, true)

            virtualFile.setupGeneratorForm(
                NxGenerator(generator = generatorWithOptions, contextValues = generatorContext)
            )
        }
    }

    companion object {
        fun getInstance(project: Project): NxGenerateService =
            project.getService(NxGenerateService::class.java)
    }
}

private fun matchWithWildcards(text: String, pattern: String): Boolean {
    val regexFromPattern =
        Regex("${pattern.split("*").map { escapeRegex(it) }.joinToString(".*")}$")
    return regexFromPattern.matches(text)
}

private fun escapeRegex(text: String): String {
    return text.replace("([.*+?^=!:{$}()|[\\]/\\\\])", "\\$1")
}
