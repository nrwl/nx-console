package dev.nx.console.logs

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import dev.nx.console.NxIcons
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import kotlinx.coroutines.launch

class OpenNxLogsAction : AnAction("View Nx Logs", "Open Nx Console logs viewer", NxIcons.Action) {

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            NxLogsViewerService.getInstance(project).openLogViewer()
        }
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}
