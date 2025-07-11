package dev.nx.console.generate

import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.util.ui.JBUI
import dev.nx.console.generate.run_generator.RunGeneratorManager
import dev.nx.console.generate.ui.GeneratorSchema
import dev.nx.console.generate.ui.NxGenerateUiRenderer
import dev.nx.console.generate.ui.NxGeneratorListCellRenderer
import dev.nx.console.generate.ui.file.NxGenerateUiFileRenderer
import dev.nx.console.models.NxGenerator
import dev.nx.console.models.NxGeneratorOption
import dev.nx.console.nxls.NxlsService
import dev.nx.console.nxls.server.requests.NxGeneratorOptionsRequestOptions
import dev.nx.console.settings.NxConsoleProjectSettingsProvider
import dev.nx.console.settings.options.GeneratorFilter
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.nxlsWorkingPath
import java.awt.Dimension
import javax.swing.ListSelectionModel.SINGLE_SELECTION
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

@Service(Service.Level.PROJECT)
class NxGenerateService(val project: Project, private val cs: CoroutineScope) {

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

    suspend fun selectGenerator(actionEvent: AnActionEvent?) = suspendCoroutine {
        cs.launch {
            val generators = getFilteredGenerators()

            if (generators.isEmpty()) {
                val hasErrors =
                    (NxlsService.getInstance(project).workspace()?.errors?.size ?: 0) > 0
                Notifier.notifyNoGenerators(project, hasErrors)

                return@launch it.resume(null)
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
        options: List<NxGeneratorOption>? = null,
    ) {
        val generatorOptions =
            options
                ?: run {
                    val requestOptions =
                        NxGeneratorOptionsRequestOptions(
                            collection = generator.data.collection,
                            name = generator.data.name,
                            path = generator.schemaPath,
                        )
                    val rawOptions = project.service<NxlsService>().generatorOptions(requestOptions)
                    val inputSchema =
                        GeneratorSchema(
                            collectionName = generator.data.collection,
                            generatorName = generator.data.name,
                            description = generator.data.description ?: "",
                            options = rawOptions,
                            context = null,
                        )
                    val transformedSchema =
                        project.service<NxlsService>().transformedGeneratorSchema(inputSchema)
                    transformedSchema.options
                }

        val generatorWithOptions = NxGenerator(generator, generatorOptions)

        val generatorContext =
            project
                .service<NxlsService>()
                .generatorContextFromPath(
                    generatorWithOptions,
                    contextPath?.let { nxlsWorkingPath(contextPath) },
                )

        ApplicationManager.getApplication().invokeLater {
            val renderers = NxGenerateUiRenderer.EP_NAME.extensionList
            val renderer = renderers.firstOrNull() ?: NxGenerateUiFileRenderer()
            renderer.openGenerateUi(
                project,
                NxGenerator(generator = generatorWithOptions, contextValues = generatorContext),
                RunGeneratorManager(project),
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
