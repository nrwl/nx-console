package dev.nx.console.lsp.server

import org.eclipse.lsp4j.jsonrpc.services.JsonDelegate
import org.eclipse.lsp4j.services.LanguageServer

interface NxlsLanguageServer : LanguageServer {
  @JsonDelegate
  fun getNxService(): NxService {
    throw UnsupportedOperationException()
  }

}



