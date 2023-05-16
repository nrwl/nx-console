package dev.nx.console.run.actions

import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.ApplicationManager
import com.intellij.util.application
import dev.nx.console.NxIcons
import dev.nx.console.run.NxTaskExecutionManager
import dev.nx.console.services.NxlsService
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.getNxProjectFromDataContext
import dev.nx.console.utils.selectNxProject
import dev.nx.console.utils.selectTargetForNxProject
import kotlinx.coroutines.*

class NxRunTargetActionGroup : ActionGroup() {

    init {
        templatePresentation.isHideGroupIfEmpty = true
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        super.update(e)
        // depending on whether this is called from a popup or the action search
        // we have to either provide child actions or perform an action
        if (!ActionPlaces.isPopupPlace(e.place)) {
            this.templatePresentation.isPerformGroup = true
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val currentlyOpenedProject = getNxProjectFromDataContext(project, e.dataContext)

        CoroutineScope(Dispatchers.Default).launch {
            val nxProject =
                selectNxProject(project, e.dataContext, currentlyOpenedProject) ?: return@launch
            val nxTarget =
                selectTargetForNxProject(project, e.dataContext, nxProject) ?: return@launch

            ApplicationManager.getApplication().invokeLater {
                NxTaskExecutionManager.getInstance(project).execute(nxProject, nxTarget)
            }
        }
    }

    override fun getChildren(e: AnActionEvent?): Array<AnAction> {
        val project = e?.project ?: return emptyArray()
        val path = e?.dataContext?.getData(CommonDataKeys.VIRTUAL_FILE)?.path ?: return emptyArray()

        val nxlsService = NxlsService.getInstance(project)

        return application.runReadAction<Array<AnAction>> {
            val nxProject =
                runBlocking { nxlsService.generatorContextFromPath(path = path)?.project }
                    ?: return@runReadAction emptyArray()

            val targets = runBlocking {
                nxlsService.workspace()?.workspace?.projects?.get(nxProject)?.targets?.keys
            }

            return@runReadAction targets?.map { NxRunTargetAction(nxProject, it) }?.toTypedArray()
                ?: emptyArray()
        }
    }
}

private class NxRunTargetAction(private val nxProject: String, private val nxTarget: String) :
    AnAction() {

    init {
        templatePresentation.text = "Run $nxProject:$nxTarget"
        templatePresentation.icon = NxIcons.Action
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project).featureUsed("Nx Run - context menu")

        NxTaskExecutionManager.getInstance(project).execute(nxProject, nxTarget)
    }
}
