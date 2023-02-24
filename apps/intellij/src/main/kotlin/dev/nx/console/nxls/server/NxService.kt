package dev.nx.console.nxls.server

import dev.nx.console.models.NxGenerator
import dev.nx.console.models.NxGeneratorContext
import dev.nx.console.models.NxGeneratorOption
import dev.nx.console.nxls.server.requests.NxGeneratorOptionsRequest
import dev.nx.console.nxls.server.requests.NxGeneratorsRequest
import dev.nx.console.nxls.server.requests.NxGetGeneratorContextFromPathRequest
import dev.nx.console.nxls.server.requests.NxWorkspaceRequest
import java.util.concurrent.CompletableFuture
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment

@JsonSegment("nx")
interface NxService {

    @JsonRequest
    fun workspace(
        workspaceRequest: NxWorkspaceRequest = NxWorkspaceRequest()
    ): CompletableFuture<com.google.gson.JsonObject> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun generators(
        generatorsRequest: NxGeneratorsRequest = NxGeneratorsRequest()
    ): CompletableFuture<List<NxGenerator>> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun generatorOptions(
        generatorOptionsRequest: NxGeneratorOptionsRequest
    ): CompletableFuture<List<NxGeneratorOption>> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun generatorContextFromPath(
        generatorContextFromPathRequest: NxGetGeneratorContextFromPathRequest
    ): CompletableFuture<NxGeneratorContext> {
        throw UnsupportedOperationException()
    }

    @JsonNotification
    fun refreshWorkspace() {
        throw UnsupportedOperationException()
    }
}
