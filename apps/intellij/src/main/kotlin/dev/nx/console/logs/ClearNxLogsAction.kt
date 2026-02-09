package dev.nx.console.logs

import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.NxIcons
import dev.nx.console.utils.NxConsoleLogger

class ClearNxLogsAction :
    DumbAwareAction("Clear Nx Console Logs", "Clears all Nx Console logs", NxIcons.Action) {

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.BGT
    }

    override fun update(e: AnActionEvent) {
        if (
            e.place == ActionPlaces.getPopupPlace(ActionPlaces.TABS_MORE_TOOLBAR) ||
                e.place == ActionPlaces.EDITOR_TAB_POPUP
        ) {
            val file = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)
            if (file != null && file.fileType.name == NxLogsFileType.INSTANCE.name) {
                e.presentation.isVisible = true
                return
            } else {
                e.presentation.isVisible = false
            }
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        NxConsoleLogger.getInstance().clearLogs()
    }
}
