package dev.nx.console.nxls

import com.intellij.notification.Notification
import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.graph.ui.NxGraphFileType
import dev.nx.console.services.NxlsService

class NxRefreshWorkspaceAction :
    DumbAwareAction("Refresh Nx Workspace", "Refreshes the Nx workspace", null) {

    override fun update(e: AnActionEvent) {
        val p = e.place
        if (
            e.place == ActionPlaces.getPopupPlace(ActionPlaces.TABS_MORE_TOOLBAR) ||
                e.place == ActionPlaces.EDITOR_TAB_POPUP
        ) {
            val file = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)
            if (file != null && file.fileType.name == NxGraphFileType.INSTANCE.name) {
                e.presentation.isVisible = true
                return
            } else {
                e.presentation.isVisible = false
            }
        }
    }
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        try {
            Notification.get(e).expire()
        } catch (e: Throwable) {
            // do nothing
            // This action can be triggered from a notification as well as the command prompt
        }

        NxlsService.getInstance(project).refreshWorkspace()
    }
}
