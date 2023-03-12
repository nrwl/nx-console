package dev.nx.console.generate

import com.intellij.icons.AllIcons
import com.intellij.ide.actions.searcheverywhere.SearchEverywhereContributor
import com.intellij.ide.actions.searcheverywhere.SearchEverywhereContributorFactory
import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.util.text.StringUtil
import com.intellij.psi.codeStyle.NameUtil
import com.intellij.util.Processor
import dev.nx.console.generate.ui.DefaultNxGenerateUiFile
import dev.nx.console.generate.ui.NxGeneratorListCellRenderer
import dev.nx.console.models.NxGenerator
import dev.nx.console.models.NxGeneratorOption
import dev.nx.console.nxls.server.requests.NxGeneratorOptionsRequestOptions
import dev.nx.console.services.NxlsService
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentMap
import javax.swing.ListCellRenderer
import kotlinx.coroutines.runBlocking

class NxGeneratorSearchEvrywhereContributor : SearchEverywhereContributorFactory<NxGenerator> {
    override fun createContributor(
        initEvent: AnActionEvent
    ): SearchEverywhereContributor<NxGenerator> = NxGeneratorSEContributor(initEvent)
}

class NxGeneratorSEContributor(val event: AnActionEvent) :
    SearchEverywhereContributor<NxGenerator> {

    private val project = event.getRequiredData(CommonDataKeys.PROJECT)

    private val generators = runBlocking { project.service<NxlsService>().generators() }

    private val generatorToOptionsCache: ConcurrentMap<NxGenerator, List<NxGeneratorOption>> =
        ConcurrentHashMap()

    override fun getSearchProviderId(): String = javaClass.name

    override fun getGroupName(): String = "Nx"

    override fun getSortWeight(): Int = 0

    override fun showInFindResults(): Boolean = true

    override fun getElementsRenderer(): ListCellRenderer<in NxGenerator> =
        NxGeneratorListCellRenderer(
            myIcon = AllIcons.Actions.GeneratedFolder,
            alternatingRowColors = false,
        )

    override fun getDataForItem(element: NxGenerator, dataId: String): Any? {
        return null
    }

    override fun processSelectedItem(
        selected: NxGenerator,
        modifiers: Int,
        searchText: String
    ): Boolean {
        val service = project.service<NxlsService>()
        val generatorOptions: List<NxGeneratorOption>? =
            generatorToOptionsCache.computeIfAbsent(selected) {
                runBlocking {
                    service.generatorOptions(
                        NxGeneratorOptionsRequestOptions(it.data.collection, it.name, it.path)
                    )
                }
            }

        val path =
            if (ActionPlaces.isPopupPlace(event.place)) {
                event.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path
            } else {
                null
            }

        val generatorWithOptions = NxGenerator(selected, generatorOptions)

        val generatorContext = runBlocking {
            path?.let { service.generatorContextFromPath(generatorWithOptions, path) }
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
        return true
    }

    override fun fetchElements(
        pattern: String,
        progressIndicator: ProgressIndicator,
        consumer: Processor<in NxGenerator>
    ) {

        if (StringUtil.isEmptyOrSpaces(pattern)) {
            return
        }

        val matcher = NameUtil.buildMatcher(pattern).build()

        ProgressManager.getInstance()
            .executeProcessUnderProgress(
                { generators.filter { matcher.matches(it.name) }.forEach { consumer.process(it) } },
                progressIndicator
            )
    }
}
