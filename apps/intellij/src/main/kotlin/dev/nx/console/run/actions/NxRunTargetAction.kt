package dev.nx.console.run.actions

import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.EDT
import dev.nx.console.nxls.NxlsService
import dev.nx.console.run.NxTaskExecutionManager
import dev.nx.console.utils.ActionCoroutineHolderService
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.selectNxProject
import dev.nx.console.utils.selectTargetForNxProject
import kotlinx.coroutines.*

class NxRunTargetAction : AnAction() {

    init {
        templatePresentation.isHideGroupIfEmpty = true
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val path = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path

        ActionCoroutineHolderService.getInstance(project).cs.launch {
            val currentlyOpenedProject =
                path?.let { NxlsService.getInstance(project).projectByPath(path = it)?.name }
            val nxProject =
                if (ActionPlaces.isPopupPlace(e.place)) currentlyOpenedProject
                else selectNxProject(project, e.dataContext, currentlyOpenedProject)

            if (nxProject == null) {
                if (ActionPlaces.isPopupPlace(e.place)) {
                    Notifier.notifyNoProject(project, path)
                }
                return@launch
            }
            val nxTarget =
                selectTargetForNxProject(project, e.dataContext, nxProject) ?: return@launch

            withContext(Dispatchers.EDT) {
                NxTaskExecutionManager.getInstance(project).execute(nxProject, nxTarget)
            }
        }
    }
}
