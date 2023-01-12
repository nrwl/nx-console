package dev.nx.console.languageServer

import org.eclipse.lsp4j.MessageActionItem
import org.eclipse.lsp4j.MessageParams
import org.eclipse.lsp4j.PublishDiagnosticsParams
import org.eclipse.lsp4j.ShowMessageRequestParams
import org.eclipse.lsp4j.services.LanguageClient
import java.util.concurrent.CompletableFuture

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
    TODO("Not yet implemented")
  }

}
