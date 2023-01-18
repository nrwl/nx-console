package dev.nx.console.nxls.client

import com.intellij.openapi.diagnostic.logger
import org.eclipse.lsp4j.MessageActionItem
import org.eclipse.lsp4j.MessageParams
import org.eclipse.lsp4j.PublishDiagnosticsParams
import org.eclipse.lsp4j.ShowMessageRequestParams
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification
import org.eclipse.lsp4j.services.LanguageClient
import java.util.concurrent.CompletableFuture

private val log = logger<NxlsLanguageClient>()

class NxlsLanguageClient : LanguageClient {
    override fun telemetryEvent(`object`: Any?) {
        TODO("Not yet implemented")
    }

    override fun publishDiagnostics(diagnostics: PublishDiagnosticsParams?) {
        TODO("Not yet implemented")
    }

    override fun showMessage(messageParams: MessageParams?) {
        TODO("Not yet implemented")
    }

    override fun showMessageRequest(requestParams: ShowMessageRequestParams?): CompletableFuture<MessageActionItem> {
        TODO("Not yet implemented")
    }

    override fun logMessage(message: MessageParams?) {
        log.info(message?.message)
    }

    @JsonNotification("nx/refreshWorkspace")
    fun refreshWorkspace() {
        log.info("Refresh workspace called from nxls")
    }
}
