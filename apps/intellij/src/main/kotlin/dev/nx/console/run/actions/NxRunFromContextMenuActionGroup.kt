package dev.nx.console.run.actions

import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.diagnostic.logger
import com.intellij.util.application
import dev.nx.console.NxIcons
import dev.nx.console.run.NxTaskExecutionManager
import dev.nx.console.services.NxlsService
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.getNxProjectFromDataContext
import dev.nx.console.utils.selectNxProject
import dev.nx.console.utils.selectTargetForNxProject
import kotlinx.coroutines.*

class NxRunFromContextMenuActionGroup : ActionGroup() {

    init {
        templatePresentation.isHideGroupIfEmpty = true
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        super.update(e)
        if (!ActionPlaces.isPopupPlace(e.place)) {
            this.templatePresentation.isPerformGroup = true
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        CoroutineScope(Dispatchers.Default).launch {
            try {
                val currentlyOpenedProject = getNxProjectFromDataContext(project, e.dataContext)
                val nxProject =
                    selectNxProject(project, e.dataContext, currentlyOpenedProject) ?: return@launch
                val nxTarget =
                    selectTargetForNxProject(project, e.dataContext, nxProject) ?: return@launch

                NxTaskExecutionManager.getInstance(project).execute(nxProject, nxTarget)
            } catch (e: Error) {
                logger<NxRunFromContextMenuActionGroup>().info(e.toString())
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

            return@runReadAction targets?.map { ChildNxRunAction(nxProject, it) }?.toTypedArray()
                ?: emptyArray()
        }
    }
}

private class ChildNxRunAction(private val nxProject: String, private val nxTarget: String) :
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
