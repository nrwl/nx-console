package dev.nx.console.nxls.client

import com.intellij.openapi.diagnostic.logger
import java.util.concurrent.CompletableFuture
import org.eclipse.lsp4j.MessageActionItem
import org.eclipse.lsp4j.MessageParams
import org.eclipse.lsp4j.PublishDiagnosticsParams
import org.eclipse.lsp4j.ShowMessageRequestParams
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification
import org.eclipse.lsp4j.services.LanguageClient

private val log = logger<NxlsLanguageClient>()

class NxlsLanguageClient : LanguageClient {

    val refreshCallbacks: MutableList<() -> Unit> = mutableListOf()
    val refreshStartedCallback: MutableList<() -> Unit> = mutableListOf()

    override fun telemetryEvent(`object`: Any?) {
        TODO("Not yet implemented")
    }

    override fun publishDiagnostics(diagnostics: PublishDiagnosticsParams?) {
        TODO("Not yet implemented")
    }

    override fun showMessage(messageParams: MessageParams?) {
        TODO("Not yet implemented")
    }

    override fun showMessageRequest(
        requestParams: ShowMessageRequestParams?
    ): CompletableFuture<MessageActionItem> {
        TODO("Not yet implemented")
    }

    override fun logMessage(message: MessageParams?) {
        log.info(message?.message)
    }

    fun registerRefreshCallback(block: () -> Unit) {
        refreshCallbacks.add(block)
    }

    fun registerRefreshStartedCallback(block: () -> Unit) {
        refreshStartedCallback.add(block)
    }

    @JsonNotification("nx/refreshWorkspace")
    fun refreshWorkspace() {
        log.info("Refresh workspace called from nxls")
        refreshCallbacks.forEach { it() }
    }

    @JsonNotification("nx/refreshWorkspaceStarted")
    fun refreshWorkspaceStarted() {
        log.info("Refresh workspace started called from nxls")
        refreshStartedCallback.forEach { it() }
    }
}
