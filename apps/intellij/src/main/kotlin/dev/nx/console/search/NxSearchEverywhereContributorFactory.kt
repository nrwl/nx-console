package dev.nx.console.search

import com.intellij.ide.actions.searcheverywhere.PossibleSlowContributor
import com.intellij.ide.actions.searcheverywhere.SearchEverywhereContributor
import com.intellij.ide.actions.searcheverywhere.SearchEverywhereContributorFactory
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.EDT
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.runBlockingCancellable
import com.intellij.psi.codeStyle.NameUtil
import com.intellij.util.Processor
import dev.nx.console.generate.NxGenerateService
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.NxTaskExecutionManager
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.openNxProjectConfiguration
import javax.swing.ListCellRenderer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

internal class NxSearchEverywhereContributorFactory :
    SearchEverywhereContributorFactory<NxSearchItem> {
    override fun createContributor(
        initEvent: AnActionEvent
    ): SearchEverywhereContributor<NxSearchItem> = NxSearchEverywhereContributor(initEvent)
}

class NxSearchEverywhereContributor(private val event: AnActionEvent) :
    SearchEverywhereContributor<NxSearchItem>, PossibleSlowContributor {
    private val project = event.project!!

    override fun getSearchProviderId(): String = javaClass.name

    override fun getGroupName(): String = "Nx"

    override fun getSortWeight(): Int = 0

    override fun showInFindResults(): Boolean = true

    override fun getElementsRenderer(): ListCellRenderer<in NxSearchItem> =
        NxSearchListCellRenderer()

    override fun processSelectedItem(
        selected: NxSearchItem,
        modifiers: Int,
        searchText: String,
    ): Boolean {
        val path = event.getData(CommonDataKeys.VIRTUAL_FILE)?.path
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            when (selected) {
                is NxSearchItem.Generator ->
                    NxGenerateService.getInstance(project)
                        .openGenerateUi(project, selected.generator, path)
                is NxSearchItem.Target ->
                    withContext(Dispatchers.EDT) {
                        NxTaskExecutionManager.getInstance(project)
                            .execute(selected.project, selected.target)
                    }
                is NxSearchItem.Project ->
                    withContext(Dispatchers.EDT) {
                        openNxProjectConfiguration(project, selected.root)
                    }
            }
        }
        return true
    }

    override fun fetchElements(
        pattern: String,
        progressIndicator: ProgressIndicator,
        consumer: Processor<in NxSearchItem>,
    ) {
        if (pattern.isBlank()) return
        val matcher = NxSearchMatcher(pattern)
        val generatorMatcher = NameUtil.buildMatcher(pattern).build()
        ProgressManager.getInstance()
            .runProcess(
                {
                    runBlockingCancellable {
                        progressIndicator.checkCanceled()
                        val projects =
                            NxlsService.getInstance(project)
                                .workspace()
                                ?.projectGraph
                                ?.nodes
                                ?.values
                                ?.map { it.data }
                                ?.sortedBy { it.name }
                                .orEmpty()
                        for (nxProject in projects) {
                            progressIndicator.checkCanceled()
                            if (
                                matcher.matchesProject(nxProject.name) &&
                                    !consumer.process(
                                        NxSearchItem.Project(nxProject.name, nxProject.root)
                                    )
                            )
                                return@runBlockingCancellable
                            for (target in nxProject.targets.orEmpty().keys.sorted()) {
                                progressIndicator.checkCanceled()
                                if (
                                    matcher.matchesTarget(nxProject.name, target) &&
                                        !consumer.process(
                                            NxSearchItem.Target(nxProject.name, target)
                                        )
                                )
                                    return@runBlockingCancellable
                            }
                        }
                        progressIndicator.checkCanceled()
                        for (generator in
                            NxGenerateService.getInstance(project)
                                .getFilteredGenerators()
                                .sortedBy { it.name }) {
                            progressIndicator.checkCanceled()
                            if (
                                generatorMatcher.matches(generator.name) &&
                                    !consumer.process(NxSearchItem.Generator(generator))
                            )
                                return@runBlockingCancellable
                        }
                    }
                },
                progressIndicator,
            )
    }
}
