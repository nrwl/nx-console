package dev.nx.console.nxls.server

import org.eclipse.lsp4j.jsonrpc.services.JsonNotification
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment
import java.util.concurrent.CompletableFuture

@JsonSegment("nx")
interface NxService {

    @JsonRequest
    fun workspace(workspaceRequest: NxWorkspaceRequest = NxWorkspaceRequest()): CompletableFuture<Any> {
        throw UnsupportedOperationException()
    }

  @JsonRequest
  fun generators(generatorsRequest: NxGeneratorsRequest = NxGeneratorsRequest()): CompletableFuture<List<NxGenerator>> {
      throw UnsupportedOperationException()
  }

  @JsonRequest
  fun generatorOptions(generatorOptionsRequest: NxGeneratorOptionsRequest): CompletableFuture<List<NxGeneratorOption>> {
    throw UnsupportedOperationException()
  }

    @JsonNotification
    fun refreshWorkspace() {
        throw UnsupportedOperationException()
    }
}


