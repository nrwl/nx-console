package dev.nx.console.nxls

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspClient
import com.intellij.platform.lsp.api.LspIntegrationProvider
import com.intellij.platform.lsp.api.lsWidget.LspClientWidgetItem
import dev.nx.console.utils.DocumentUtils

class NxlsIntegrationProvider : LspIntegrationProvider {
    override fun createWidgetItem(
        lspClient: LspClient,
        currentFile: VirtualFile?,
    ): LspClientWidgetItem = NxlsClientWidgetItem(lspClient, currentFile)

    override fun fileOpened(
        project: Project,
        file: VirtualFile,
        clientStarter: LspIntegrationProvider.LspClientStarter,
    ) {
        if (DocumentUtils.isNxFile(file.name)) {
            NxlsSession.getInstance(project)
                .descriptorForDiscovery()
                ?.let(clientStarter::ensureClientStarted)
        }
    }
}
