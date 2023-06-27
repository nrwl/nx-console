package dev.nx.console.generate

import com.intellij.icons.AllIcons
import com.intellij.ide.actions.searcheverywhere.PossibleSlowContributor
import com.intellij.ide.actions.searcheverywhere.SearchEverywhereContributor
import com.intellij.ide.actions.searcheverywhere.SearchEverywhereContributorFactory
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.Application
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.util.ProgressIndicatorUtils
import com.intellij.openapi.util.text.StringUtil
import com.intellij.psi.codeStyle.NameUtil
import com.intellij.util.Processor
import dev.nx.console.generate.ui.NxGeneratorListCellRenderer
import dev.nx.console.models.NxGenerator
import javax.swing.ListCellRenderer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class NxGeneratorSearchEverywhereContributorFactory :
    SearchEverywhereContributorFactory<NxGenerator> {
    override fun createContributor(
        initEvent: AnActionEvent
    ): SearchEverywhereContributor<NxGenerator> = NxGeneratorSearchEverywhereContributor(initEvent)
}

class NxGeneratorSearchEverywhereContributor(private val event: AnActionEvent) :
    SearchEverywhereContributor<NxGenerator>, PossibleSlowContributor {

    private val project = event.getRequiredData(CommonDataKeys.PROJECT)

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
        val path = event.getData(CommonDataKeys.VIRTUAL_FILE)?.path
        NxGenerateService.getInstance(project).openGenerateUi(project, selected, path)
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

        val task = Runnable {
            CoroutineScope(Dispatchers.Default).launch {
                NxGenerateService.getInstance(project)
                    .getFilteredGenerators()
                    .filter { matcher.matches(it.name) }
                    .forEach { consumer.process(it) }
            }
        }
        val application: Application = ApplicationManager.getApplication()
        if (application.isDispatchThread) {
            application.runReadAction(task)
        } else {
            ProgressIndicatorUtils.yieldToPendingWriteActions()
            ProgressIndicatorUtils.runInReadActionWithWriteActionPriority(task, progressIndicator)
        }
    }
}
