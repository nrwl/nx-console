package dev.nx.console.nxls

import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import dev.nx.console.graph.ui.NxGraphFileType
import dev.nx.console.services.NxlsService

class NxRefreshWorkspaceAction : AnAction() {

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

        NxlsService.getInstance(project).refreshWorkspace()
    }
}
