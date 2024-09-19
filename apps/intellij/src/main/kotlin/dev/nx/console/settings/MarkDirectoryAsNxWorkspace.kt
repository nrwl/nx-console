package dev.nx.console.settings

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.project.DumbAware
import dev.nx.console.NxIcons
import dev.nx.console.nxls.NxlsService
import java.nio.file.Paths

class MarkDirectoryAsNxWorkspace : AnAction(), DumbAware {
    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        e.presentation.text = "Nx Workspace Root"
        e.presentation.icon = NxIcons.Action
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val path = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path ?: return
        val relativePath = Paths.get(project.basePath ?: "").relativize(Paths.get(path)).toString()
        NxConsoleProjectSettingsProvider.getInstance(project).workspacePath = relativePath

        NxlsService.getInstance(project).changeWorkspace(relativePath)
    }
}
