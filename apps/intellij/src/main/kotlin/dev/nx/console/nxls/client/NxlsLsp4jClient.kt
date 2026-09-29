package dev.nx.console.nxls.client

import com.intellij.openapi.project.Project
import com.intellij.platform.lsp.api.Lsp4jClient
import com.intellij.platform.lsp.api.LspServerNotificationsHandler
import dev.nx.console.nxls.NxlsService.Companion.NX_WORKSPACE_REFRESH_STARTED_TOPIC
import dev.nx.console.nxls.NxlsService.Companion.NX_WORKSPACE_REFRESH_TOPIC
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
        session.ifCurrent(generation) {
            project.messageBus.syncPublisher(NX_WORKSPACE_REFRESH_TOPIC).onNxWorkspaceRefresh()
        }
    }

    @JsonNotification("nx/refreshWorkspaceStarted")
    fun refreshWorkspaceStarted() {
        session.ifCurrent(generation) {
            project.messageBus
                .syncPublisher(NX_WORKSPACE_REFRESH_STARTED_TOPIC)
                .onWorkspaceRefreshStarted()
        }
    }

    @JsonNotification("nx/fileWatcherOperational")
    fun fileWatcherOperational(params: FileWatcherOperationalParams) {
        session.ifCurrent(generation) {
            WatcherRunningService.getInstance(project).setStatus(params.status)
        }
    }
}

data class FileWatcherOperationalParams(val status: String)
