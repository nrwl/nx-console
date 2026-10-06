package dev.nx.console.nxls

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lang.lsWidget.LanguageServicePopupSection
import com.intellij.platform.lsp.api.LspBundle
import com.intellij.platform.lsp.api.LspClient
import com.intellij.platform.lsp.api.LspServerState
import com.intellij.platform.lsp.api.lsWidget.LspClientWidgetItem

internal class NxlsClientWidgetItem(lspClient: LspClient, currentFile: VirtualFile?) :
    LspClientWidgetItem(lspClient, currentFile) {
    override fun createStopOrRestartAction(): AnAction? {
        if (
            widgetActionLocation != LanguageServicePopupSection.ForCurrentFile &&
                lspClient.state != LspServerState.ShutdownUnexpectedly
        ) {
            return super.createStopOrRestartAction()
        }
        return object :
            DumbAwareAction(
                LspBundle.message("action.RestartLspServerAction.text"),
                null,
                AllIcons.Actions.StopAndRestart,
            ) {
            override fun actionPerformed(e: AnActionEvent) {
                // Retire before platform removal: the first launch hook may still be queued.
                NxlsSession.getInstance(lspClient.project).restart()
            }
        }
    }
}
