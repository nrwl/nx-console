package dev.nx.console.nxls

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspServerSupportProvider
import dev.nx.console.utils.DocumentUtils

class NxlsServerSupportProvider : LspServerSupportProvider {
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
