package dev.nx.console.nxls.client

import com.intellij.openapi.project.Project
import com.intellij.platform.lsp.api.Lsp4jClient
import com.intellij.platform.lsp.api.LspServerNotificationsHandler
import dev.nx.console.nxls.NxlsSession
import dev.nx.console.nxls.WatcherRunningService
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification

class NxlsLsp4jClient(
    handler: LspServerNotificationsHandler,
    private val project: Project,
    private val session: NxlsSession,
    private val generation: Long,
) : Lsp4jClient(handler) {
    @JsonNotification("nx/refreshWorkspace")
    fun refreshWorkspace() {
        session.workspaceRefresh(generation, started = false)
    }

    @JsonNotification("nx/refreshWorkspaceStarted")
    fun refreshWorkspaceStarted() {
        session.workspaceRefresh(generation, started = true)
    }

    @JsonNotification("nx/fileWatcherOperational")
    fun fileWatcherOperational(params: FileWatcherOperationalParams) {
        session.ifCurrent(generation) {
            WatcherRunningService.getInstance(project).setStatus(params.status)
        }
    }
}

data class FileWatcherOperationalParams(val status: String)
