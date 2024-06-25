package dev.nx.console.nxls.server

import dev.nx.console.generate.ui.GenerateUiStartupMessageDefinition
import dev.nx.console.generate.ui.GeneratorSchema
import dev.nx.console.models.*
import dev.nx.console.nxls.server.requests.*
import java.util.concurrent.CompletableFuture
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment

@JsonSegment("nx")
interface NxService {

    @JsonRequest
    fun workspace(
        workspaceRequest: NxWorkspaceRequest = NxWorkspaceRequest()
    ): CompletableFuture<NxWorkspace> {
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
    fun generatorContextV2(
        generatorContextFromPathRequest: NxGetGeneratorContextFromPathRequest
    ): CompletableFuture<NxGeneratorContext> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun projectByPath(projectByPathRequest: NxProjectByPathRequest): CompletableFuture<NxProject?> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun projectsByPaths(
        projectsByPathsRequest: NxProjectsByPathsRequest
    ): CompletableFuture<Map<String, NxProject>> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun projectGraphOutput(): CompletableFuture<ProjectGraphOutput> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun createProjectGraph(
        createProjectGraphRequest: NxCreateProjectGraphRequest
    ): CompletableFuture<String?> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun projectFolderTree(): CompletableFuture<SerializedNxFolderTreeData> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun transformedGeneratorSchema(schema: GeneratorSchema): CompletableFuture<GeneratorSchema> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun startupMessage(
        schema: GeneratorSchema
    ): CompletableFuture<GenerateUiStartupMessageDefinition> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun version(): CompletableFuture<NxVersion> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun sourceMapFilesToProjectMap(): CompletableFuture<Map<String, String>> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun targetsForConfigFile(
        targetsForConfigFileRequest: NxTargetsForConfigFileRequest
    ): CompletableFuture<Map<String, NxTarget>> {
        throw UnsupportedOperationException()
    }

    @JsonNotification
    fun changeWorkspace(workspacePath: String) {
        throw UnsupportedOperationException()
    }

    @JsonNotification
    fun refreshWorkspace() {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun stopDaemon(): CompletableFuture<Unit> {
        throw UnsupportedOperationException()
    }

    @JsonRequest
    fun cloudStatus(): CompletableFuture<NxCloudStatus> {
        throw UnsupportedOperationException()
    }
}
