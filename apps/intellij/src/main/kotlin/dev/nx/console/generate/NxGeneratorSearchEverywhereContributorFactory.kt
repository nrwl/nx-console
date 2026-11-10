package dev.nx.console.generate

import com.intellij.icons.AllIcons
import com.intellij.ide.actions.searcheverywhere.PossibleSlowContributor
import com.intellij.ide.actions.searcheverywhere.SearchEverywhereContributor
import com.intellij.ide.actions.searcheverywhere.SearchEverywhereContributorFactory
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.runBlockingCancellable
import com.intellij.openapi.util.text.StringUtil
import com.intellij.psi.codeStyle.NameUtil
import com.intellij.util.Processor
import dev.nx.console.generate.ui.NxGeneratorListCellRenderer
import dev.nx.console.models.NxGenerator
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import javax.swing.ListCellRenderer
import kotlinx.coroutines.launch

internal class NxGeneratorSearchEverywhereContributorFactory :
    SearchEverywhereContributorFactory<NxGenerator> {
    override fun createContributor(
        initEvent: AnActionEvent
    ): SearchEverywhereContributor<NxGenerator> = NxGeneratorSearchEverywhereContributor(initEvent)
}

class NxGeneratorSearchEverywhereContributor(private val event: AnActionEvent) :
    SearchEverywhereContributor<NxGenerator>, PossibleSlowContributor {

    private val project = event.project!!

    override fun getSearchProviderId(): String = javaClass.name

    override fun getGroupName(): String = "Nx"

    override fun getSortWeight(): Int = 0

    override fun showInFindResults(): Boolean = true

    override fun getElementsRenderer(): ListCellRenderer<in NxGenerator> =
        NxGeneratorListCellRenderer(
            myIcon = AllIcons.Actions.GeneratedFolder,
            alternatingRowColors = false,
        )

    override fun processSelectedItem(
        selected: NxGenerator,
        modifiers: Int,
        searchText: String,
    ): Boolean {
        val path = event.getData(CommonDataKeys.VIRTUAL_FILE)?.path
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            NxGenerateService.getInstance(project).openGenerateUi(project, selected, path)
        }
        return true
    }

    override fun fetchElements(
        pattern: String,
        progressIndicator: ProgressIndicator,
        consumer: Processor<in NxGenerator>,
    ) {

        if (StringUtil.isEmptyOrSpaces(pattern)) {
            return
        }

        val matcher = NameUtil.buildMatcher(pattern).build()

        ProgressManager.getInstance()
            .runProcess(
                {
                    runBlockingCancellable {
                        for (generator in
                            NxGenerateService.getInstance(project).getFilteredGenerators()) {
                            progressIndicator.checkCanceled()
                            if (matcher.matches(generator.name) && !consumer.process(generator)) {
                                break
                            }
                        }
                    }
                },
                progressIndicator,
            )
    }
}
