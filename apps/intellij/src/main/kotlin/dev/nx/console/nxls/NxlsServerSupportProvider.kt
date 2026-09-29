package dev.nx.console.nxls

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspServer
import com.intellij.platform.lsp.api.LspServerSupportProvider
import com.intellij.platform.lsp.api.lsWidget.LspServerWidgetItem
import dev.nx.console.utils.DocumentUtils

class NxlsServerSupportProvider : LspServerSupportProvider {
    override fun createLspServerWidgetItem(
        lspServer: LspServer,
        currentFile: VirtualFile?,
    ): LspServerWidgetItem = NxlsServerWidgetItem(lspServer, currentFile)

    override fun fileOpened(
        project: Project,
        file: VirtualFile,
        serverStarter: LspServerSupportProvider.LspServerStarter,
    ) {
        if (DocumentUtils.isNxFile(file.name)) {
            NxlsSession.getInstance(project)
                .descriptorForDiscovery()
                ?.let(serverStarter::ensureServerStarted)
        }
    }
}
