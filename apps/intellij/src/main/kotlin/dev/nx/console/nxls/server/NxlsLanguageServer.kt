package dev.nx.console.nxls.server

import com.google.gson.JsonElement
import dev.nx.console.generate.ui.GenerateUiStartupMessageDefinition
import dev.nx.console.generate.ui.GeneratorSchema
import dev.nx.console.models.*
import dev.nx.console.nxls.server.requests.*
import java.util.concurrent.CompletableFuture
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest
import org.eclipse.lsp4j.services.LanguageServer

interface NxlsLanguageServer : LanguageServer {

    @JsonRequest("nx/workspace")
    fun workspace(
        workspaceRequest: NxWorkspaceRequest = NxWorkspaceRequest()
    ): CompletableFuture<NxWorkspace> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/workspaceSerialized")
    fun workspaceSerialized(
        workspaceRequest: NxWorkspaceRequest = NxWorkspaceRequest()
    ): CompletableFuture<String> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/generators")
    fun generators(
        generatorsRequest: NxGeneratorsRequest = NxGeneratorsRequest()
    ): CompletableFuture<JsonElement> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/generatorOptions")
    fun generatorOptions(
        generatorOptionsRequest: NxGeneratorOptionsRequest
    ): CompletableFuture<JsonElement> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/transformedGeneratorSchema")
    fun transformedGeneratorSchema(schema: GeneratorSchema): CompletableFuture<JsonElement> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/generatorContextV2")
    fun generatorContextV2(
        generatorContextFromPathRequest: NxGetGeneratorContextFromPathRequest
    ): CompletableFuture<NxGeneratorContext> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/projectByPath")
    fun projectByPath(projectByPathRequest: NxProjectByPathRequest): CompletableFuture<NxProject?> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/projectsByPaths")
    fun projectsByPaths(
        projectsByPathsRequest: NxProjectsByPathsRequest
    ): CompletableFuture<Map<String, NxProject>> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/projectGraphOutput")
    fun projectGraphOutput(): CompletableFuture<ProjectGraphOutput> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/createProjectGraph")
    fun createProjectGraph(
        createProjectGraphRequest: NxCreateProjectGraphRequest
    ): CompletableFuture<String?> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/projectFolderTree")
    fun projectFolderTree(): CompletableFuture<SerializedNxFolderTreeData> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/startupMessage")
    fun startupMessage(
        schema: GeneratorSchema
    ): CompletableFuture<GenerateUiStartupMessageDefinition> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/version")
    fun version(request: NxVersionRequest): CompletableFuture<NxVersion> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/sourceMapFilesToProjectsMap")
    fun sourceMapFilesToProjectsMap(): CompletableFuture<Map<String, Array<String>>> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/targetsForConfigFile")
    fun targetsForConfigFile(
        targetsForConfigFileRequest: NxTargetsForConfigFileRequest
    ): CompletableFuture<Map<String, NxTarget>> {
        throw UnsupportedOperationException()
    }

    @JsonNotification("nx/changeWorkspace")
    fun changeWorkspace(workspacePath: String) {
        throw UnsupportedOperationException()
    }

    @JsonNotification("nx/refreshWorkspace")
    fun refreshWorkspace() {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/stopDaemon")
    fun stopDaemon(): CompletableFuture<Unit> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/startDaemon")
    fun startDaemon(): CompletableFuture<Unit> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/cloudStatus")
    fun cloudStatus(): CompletableFuture<NxCloudStatus> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/configureAiAgentsStatus")
    fun configureAiAgentsStatus(): CompletableFuture<ConfigureAiAgentsStatus?> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/pdvData")
    fun pdvData(pdvDataRequest: PDVDataRequest): CompletableFuture<NxPDVData> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/parseTargetString")
    fun parseTargetString(targetString: String): CompletableFuture<TargetInfo> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/recentCIPEData")
    fun recentCIPEData(): CompletableFuture<CIPEDataResponse> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/cloudAuthHeaders")
    fun cloudAuthHeaders(): CompletableFuture<NxCloudAuthHeaders> {
        throw UnsupportedOperationException()
    }

    @JsonRequest("nx/downloadAndExtractArtifact")
    fun downloadAndExtractArtifact(
        request: NxDownloadAndExtractArtifactRequest
    ): CompletableFuture<NxDownloadAndExtractArtifactResponse> {
        throw UnsupportedOperationException()
    }
}
