package dev.nx.console.nxls.server

import java.util.concurrent.CompletableFuture
import kotlinx.serialization.json.JsonObject
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
