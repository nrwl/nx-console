package dev.nx.console.nxls

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.util.messages.Topic
import dev.nx.console.generate.ui.GenerateUiStartupMessageDefinition
import dev.nx.console.generate.ui.GeneratorSchema
import dev.nx.console.models.*
import dev.nx.console.nxls.client.NxlsLanguageClient
import dev.nx.console.nxls.server.*
import dev.nx.console.nxls.server.requests.*
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.nxlsWorkingPath
import java.lang.Runnable
import kotlinx.coroutines.*
import kotlinx.coroutines.future.await
import org.eclipse.lsp4j.jsonrpc.MessageIssueException
import org.eclipse.lsp4j.jsonrpc.ResponseErrorException

@Service(Service.Level.PROJECT)
class NxlsService(private val project: Project, private val cs: CoroutineScope) {
    private var wrapper: NxlsWrapper = NxlsWrapper(project, cs)

    private fun client(): NxlsLanguageClient? {
        return wrapper.languageClient
    }

    private suspend fun server(): NxlsLanguageServer? {
        if (!wrapper.isStarted()) {
            val started =
                withTimeoutOrNull(10000) {
                    wrapper.awaitStarted().await()
                    true
                }

            if (started == null) {
                return null
            }
        }
        return wrapper.languageServer
    }

    suspend fun start() {
        wrapper.start()
        awaitStarted()
        client()?.registerRefreshCallback {
            cs.launch {
                project.messageBus.syncPublisher(NX_WORKSPACE_REFRESH_TOPIC).onNxWorkspaceRefresh()
            }
        }
        client()?.registerRefreshStartedCallback {
            cs.launch {
                project.messageBus
                    .syncPublisher(NX_WORKSPACE_REFRESH_STARTED_TOPIC)
                    .onWorkspaceRefreshStarted()
            }
        }

        cs.launch {
            project.messageBus
                .syncPublisher(NX_WORKSPACE_REFRESH_STARTED_TOPIC)
                .onWorkspaceRefreshStarted()
        }
    }

    suspend fun close() {
        wrapper.stop()
    }

    suspend fun restart() {
        try {
            server()?.getNxService()?.stopDaemon()?.await()
        } catch (e: Throwable) {
            // it's not critical if the daemon can't be stopped
            thisLogger().debug("Failed to stop daemon during restart", e)
        }
        wrapper.stop()
        start()
        awaitStarted()
    }

    suspend fun refreshWorkspace() {
        server()?.getNxService()?.refreshWorkspace()
    }

    suspend fun workspace(): NxWorkspace? {
        return withMessageIssueCatch("nx/workspace") {
            server()?.getNxService()?.workspace()?.await()
        }()
    }

    suspend fun workspaceSerialized(): String? {
        return withMessageIssueCatch("nx/workspaceSerialized") {
            server()?.getNxService()?.workspaceSerialized()?.await()
        }()
    }

    suspend fun generators(): List<NxGenerator> {
        return withMessageIssueCatch("nx/generators") {
            server()?.getNxService()?.generators()?.await()
        }()
            ?: emptyList()
    }

    suspend fun generatorOptions(
        requestOptions: NxGeneratorOptionsRequestOptions
    ): List<NxGeneratorOption> {
        return withMessageIssueCatch("nx/generatorOptions") {
            val request = NxGeneratorOptionsRequest(requestOptions)
            server()?.getNxService()?.generatorOptions(request)?.await()
        }()
            ?: emptyList()
    }

    suspend fun transformedGeneratorSchema(generatorSchema: GeneratorSchema): GeneratorSchema {
        return withMessageIssueCatch("nx/transformedGeneratorSchema") {
            server()?.getNxService()?.transformedGeneratorSchema(generatorSchema)?.await()
        }()
            ?: generatorSchema
    }

    suspend fun generatorContextFromPath(
        generator: NxGenerator? = null,
        path: String?,
    ): NxGeneratorContext? {
        return withMessageIssueCatch("nx/generatorContextV2") {
            val request = NxGetGeneratorContextFromPathRequest(path)
            server()?.getNxService()?.generatorContextV2(request)?.await()
        }()
    }

    suspend fun projectByPath(path: String): NxProject? {
        return withMessageIssueCatch("nx/projectByPath") {
            val request = NxProjectByPathRequest(path)
            server()?.getNxService()?.projectByPath(request)?.await()
        }()
    }

    suspend fun projectsByPaths(paths: Array<String>): Map<String, NxProject> {
        val request = NxProjectsByPathsRequest(paths)
        return withMessageIssueCatch("nx/projectsByPaths") {
            server()?.getNxService()?.projectsByPaths(request)?.await()
        }()
            ?: emptyMap()
    }

    suspend fun projectGraphOutput(): ProjectGraphOutput? {
        return withMessageIssueCatch("nx/projectGraphOutput") {
            server()?.getNxService()?.projectGraphOutput()?.await()
        }()
    }

    suspend fun createProjectGraph(showAffected: Boolean = false): CreateProjectGraphError? {
        return withMessageIssueCatch("nx/createProjectGraph") {
            try {
                server()
                    ?.getNxService()
                    ?.createProjectGraph(NxCreateProjectGraphRequest(showAffected))
                    ?.await()
                    ?.let { CreateProjectGraphError(1000, it) }
            } catch (e: ResponseErrorException) {
                CreateProjectGraphError(e.responseError.code, e.responseError.message)
            }
        }()
    }

    suspend fun projectFolderTree(): NxFolderTreeData? {
        return withMessageIssueCatch("nx/projectFolderTree") {
            server()?.getNxService()?.projectFolderTree()?.await()?.toFolderTreeData()
        }()
    }

    suspend fun startupMessage(schema: GeneratorSchema): GenerateUiStartupMessageDefinition? {
        return withMessageIssueCatch("nx/startupMessage") {
            server()?.getNxService()?.startupMessage(schema)?.await()
        }()
    }

    suspend fun nxVersion(reset: Boolean = false): NxVersion? {
        return withMessageIssueCatch("nx/version") {
            server()?.getNxService()?.version(NxVersionRequest(reset))?.await()
        }()
    }

    suspend fun sourceMapFilesToProjectsMap(): Map<String, Array<String>> {
        return withMessageIssueCatch("nx/sourceMapFilesToProjectMap") {
            server()?.getNxService()?.sourceMapFilesToProjectsMap()?.await()
        }()
            ?: emptyMap()
    }

    suspend fun targetsForConfigFile(
        projectName: String,
        configFilePath: String,
    ): Map<String, NxTarget> {
        return withMessageIssueCatch("nx/targetsForConfigFile") {
            val request = NxTargetsForConfigFileRequest(projectName, configFilePath)
            server()?.getNxService()?.targetsForConfigFile(request)?.await()
        }()
            ?: emptyMap()
    }

    suspend fun cloudStatus(): NxCloudStatus? {
        return withMessageIssueCatch("nx/cloudStatus") {
            server()?.getNxService()?.cloudStatus()?.await()
        }()
    }

    suspend fun pdvData(filePath: String): NxPDVData? {
        return withMessageIssueCatch("nx/pdvData") {
            server()?.getNxService()?.pdvData(PDVDataRequest(filePath))?.await()
        }()
    }

    suspend fun parseTargetString(targetString: String): TargetInfo? {
        return withMessageIssueCatch("nx/parseTargetString") {
            server()?.getNxService()?.parseTargetString(targetString)?.await()
        }()
    }

    fun addDocument(editor: Editor) {
        wrapper.connect(editor)
    }

    fun removeDocument(editor: Editor) {
        wrapper.disconnect(editor)
    }

    fun changeWorkspace(workspacePath: String) {
        cs.launch { server()?.getNxService()?.changeWorkspace(nxlsWorkingPath(workspacePath)) }
    }

    fun isEditorConnected(editor: Editor): Boolean {
        return wrapper.isEditorConnected(editor)
    }

    fun runAfterStarted(block: Runnable) {
        wrapper.awaitStarted().thenRun(block)
    }

    fun isStarted(): Boolean {
        return wrapper.isStarted()
    }

    suspend fun awaitStarted() {
        wrapper.awaitStarted().await()
    }

    suspend fun recentCIPEData(): CIPEDataResponse? {
        return withMessageIssueCatch("nx/recentCIPEData") {
            server()?.getNxService()?.recentCIPEData()?.await()
        }()
    }

    suspend fun cloudAuthHeaders(): NxCloudAuthHeaders? {
        return withMessageIssueCatch("nx/cloudAuthHeaders") {
            val result = server()?.getNxService()?.cloudAuthHeaders()?.await()
            result
        }()
    }

    suspend fun downloadAndExtractArtifact(
        artifactUrl: String
    ): NxDownloadAndExtractArtifactResponse? {
        return withMessageIssueCatch("nx/downloadAndExtractArtifact") {
            val request = NxDownloadAndExtractArtifactRequest(artifactUrl = artifactUrl)
            server()?.getNxService()?.downloadAndExtractArtifact(request)?.await()
        }()
    }

    private fun <T> withMessageIssueCatch(
        requestName: String,
        block: suspend () -> T,
    ): suspend () -> T? {
        return {
            try {
                block()
            } catch (e: MessageIssueException) {
                Notifier.notifyLspMessageIssueExceptionThrottled(project, requestName, e)
                null
            } catch (e: CancellationException) {
                null
            }
        }
    }

    companion object {
        fun getInstance(project: Project): NxlsService = project.getService(NxlsService::class.java)

        val NX_WORKSPACE_REFRESH_TOPIC: Topic<NxWorkspaceRefreshListener> =
            Topic("NxWorkspaceRefresh", NxWorkspaceRefreshListener::class.java)

        val NX_WORKSPACE_REFRESH_STARTED_TOPIC: Topic<NxWorkspaceRefreshStartedListener> =
            Topic("NxWorkspaceRefreshStarted", NxWorkspaceRefreshStartedListener::class.java)
    }
}

fun interface NxWorkspaceRefreshListener {
    fun onNxWorkspaceRefresh()
}

fun interface NxWorkspaceRefreshStartedListener {
    fun onWorkspaceRefreshStarted()
}
