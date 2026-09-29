package dev.nx.console.nxls

import com.intellij.openapi.components.Service
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.util.messages.Topic
import dev.nx.console.generate.ui.GenerateUiStartupMessageDefinition
import dev.nx.console.generate.ui.GeneratorSchema
import dev.nx.console.models.*
import dev.nx.console.nxls.server.*
import dev.nx.console.nxls.server.requests.*
import dev.nx.console.utils.Notifier
import java.lang.Runnable
import java.nio.file.Paths
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import org.eclipse.lsp4j.jsonrpc.MessageIssueException
import org.eclipse.lsp4j.jsonrpc.ResponseErrorException

@Service(Service.Level.PROJECT)
class NxlsService(private val project: Project, private val cs: CoroutineScope) {
    private val responseDecoder = NxlsResponseDecoder()

    internal var sessionOverride: NxlsSession? = null
    private val session: NxlsSession
        get() = sessionOverride ?: NxlsSession.getInstance(project)

    internal var requestSender: NxlsRequestSender = NxlsRequestAdapter { session }
    private val connectedDocuments = ConcurrentHashMap.newKeySet<String>()
    private val consumersScheduled = AtomicBoolean()

    internal fun initializeConsumersOnce(block: Runnable) {
        if (consumersScheduled.compareAndSet(false, true)) runAfterStarted(block)
    }

    suspend fun start() {
        session.start()
        awaitStarted()
    }

    suspend fun close() {
        session.stop()
        connectedDocuments.clear()
    }

    suspend fun restart() {
        session.restart()
        awaitStarted()
    }

    internal fun restartWithRefreshTicket(): Deferred<Unit> = session.restartWithRefreshTicket()

    suspend fun refreshWorkspace() {
        requestSender.request {
            it.refreshWorkspace()
            CompletableFuture.completedFuture(Unit)
        }
    }

    suspend fun workspace(): NxWorkspace? {
        return withMessageIssueCatch("nx/workspace") { requestSender.request { it.workspace() } }()
    }

    suspend fun workspaceSerialized(): String? {
        return withMessageIssueCatch("nx/workspaceSerialized") {
            requestSender.request { it.workspaceSerialized() }
        }()
    }

    suspend fun generators(): List<NxGenerator> {
        return withMessageIssueCatch("nx/generators") {
            requestSender.request { it.generators() }?.let(responseDecoder::generators)
        }() ?: emptyList()
    }

    suspend fun generatorOptions(
        requestOptions: NxGeneratorOptionsRequestOptions
    ): List<NxGeneratorOption> {
        return withMessageIssueCatch("nx/generatorOptions") {
            val request = NxGeneratorOptionsRequest(requestOptions)
            requestSender
                .request { it.generatorOptions(request) }
                ?.let(responseDecoder::generatorOptions)
        }() ?: emptyList()
    }

    suspend fun transformedGeneratorSchema(generatorSchema: GeneratorSchema): GeneratorSchema {
        return withMessageIssueCatch("nx/transformedGeneratorSchema") {
            requestSender
                .request { it.transformedGeneratorSchema(generatorSchema) }
                ?.let(responseDecoder::transformedGeneratorSchema)
        }() ?: generatorSchema
    }

    suspend fun generatorContextFromPath(
        generator: NxGenerator? = null,
        path: String?,
    ): NxGeneratorContext? {
        return withMessageIssueCatch("nx/generatorContextV2") {
            val request = NxGetGeneratorContextFromPathRequest(path)
            requestSender.request { it.generatorContextV2(request) }
        }()
    }

    suspend fun projectByPath(path: String): NxProject? {
        return withMessageIssueCatch("nx/projectByPath") {
            val request = NxProjectByPathRequest(path)
            requestSender.request { it.projectByPath(request) }
        }()
    }

    suspend fun projectsByPaths(paths: Array<String>): Map<String, NxProject> {
        val request = NxProjectsByPathsRequest(paths)
        return withMessageIssueCatch("nx/projectsByPaths") {
            requestSender.request { it.projectsByPaths(request) }
        }() ?: emptyMap()
    }

    suspend fun projectGraphOutput(): ProjectGraphOutput? {
        return withMessageIssueCatch("nx/projectGraphOutput") {
            requestSender.request { it.projectGraphOutput() }
        }()
    }

    suspend fun createProjectGraph(showAffected: Boolean = false): CreateProjectGraphError? {
        return withMessageIssueCatch("nx/createProjectGraph") {
            try {
                requestSender
                    .request { it.createProjectGraph(NxCreateProjectGraphRequest(showAffected)) }
                    ?.let { CreateProjectGraphError(1000, it) }
            } catch (e: ResponseErrorException) {
                CreateProjectGraphError(e.responseError.code, e.responseError.message)
            }
        }()
    }

    suspend fun projectFolderTree(): NxFolderTreeData? {
        return withMessageIssueCatch("nx/projectFolderTree") {
            requestSender.request { it.projectFolderTree() }?.toFolderTreeData()
        }()
    }

    suspend fun startupMessage(schema: GeneratorSchema): GenerateUiStartupMessageDefinition? {
        return withMessageIssueCatch("nx/startupMessage") {
            requestSender.request { it.startupMessage(schema) }
        }()
    }

    suspend fun nxVersion(reset: Boolean = false): NxVersion? {
        return withMessageIssueCatch("nx/version") {
            requestSender.request { it.version(NxVersionRequest(reset)) }
        }()
    }

    suspend fun sourceMapFilesToProjectsMap(): Map<String, Array<String>> {
        return withMessageIssueCatch("nx/sourceMapFilesToProjectMap") {
            requestSender.request { it.sourceMapFilesToProjectsMap() }
        }() ?: emptyMap()
    }

    suspend fun targetsForConfigFile(
        projectName: String,
        configFilePath: String,
    ): Map<String, NxTarget> {
        return withMessageIssueCatch("nx/targetsForConfigFile") {
            val request = NxTargetsForConfigFileRequest(projectName, configFilePath)
            requestSender.request { it.targetsForConfigFile(request) }
        }() ?: emptyMap()
    }

    suspend fun cloudStatus(): NxCloudStatus? {
        return withMessageIssueCatch("nx/cloudStatus") {
            requestSender.request { it.cloudStatus() }
        }()
    }

    suspend fun configureAiAgentsStatus(): ConfigureAiAgentsStatus? {
        return withMessageIssueCatch("nx/configureAiAgentsStatus") {
            requestSender.request { it.configureAiAgentsStatus() }
        }()
    }

    suspend fun startDaemon() {
        withMessageIssueCatch("nx/startDaemon") { requestSender.request { it.startDaemon() } }()
    }

    suspend fun stopDaemon() {
        withMessageIssueCatch("nx/stopDaemon") { requestSender.request { it.stopDaemon() } }()
    }

    suspend fun pdvData(filePath: String): NxPDVData? {
        return withMessageIssueCatch("nx/pdvData") {
            requestSender.request { it.pdvData(PDVDataRequest(filePath)) }
        }()
    }

    suspend fun parseTargetString(targetString: String): TargetInfo? {
        return withMessageIssueCatch("nx/parseTargetString") {
            requestSender.request { it.parseTargetString(targetString) }
        }()
    }

    fun addDocument(editor: Editor) {
        connectedDocuments.add(documentKey(editor))
    }

    fun removeDocument(editor: Editor) {
        connectedDocuments.remove(documentKey(editor))
    }

    fun changeWorkspace(workspacePath: String) {
        cs.launch(Dispatchers.IO) {
            val basePath = project.basePath ?: return@launch
            val path = Paths.get(basePath).resolve(workspacePath).normalize().toString()
            val root = LocalFileSystem.getInstance().refreshAndFindFileByPath(path)
            if (root?.isDirectory == true) session.changeWorkspace(root)
        }
    }

    fun isEditorConnected(editor: Editor): Boolean {
        return connectedDocuments.contains(documentKey(editor))
    }

    fun runAfterStarted(block: Runnable) {
        cs.launch {
            awaitStarted()
            block.run()
        }
    }

    fun isStarted(): Boolean {
        return session.ready.value?.let(session::isCurrent) == true
    }

    suspend fun awaitStarted() {
        session.ready.filterNotNull().first { session.isCurrent(it) }
    }

    suspend fun recentCIPEData(): CIPEDataResponse? {
        return withMessageIssueCatch("nx/recentCIPEData") {
            requestSender.request { it.recentCIPEData() }
        }()
    }

    suspend fun cloudAuthHeaders(): NxCloudAuthHeaders? {
        return withMessageIssueCatch("nx/cloudAuthHeaders") {
            val result = requestSender.request { it.cloudAuthHeaders() }
            result
        }()
    }

    suspend fun downloadAndExtractArtifact(
        artifactUrl: String
    ): NxDownloadAndExtractArtifactResponse? {
        return withMessageIssueCatch("nx/downloadAndExtractArtifact") {
            val request = NxDownloadAndExtractArtifactRequest(artifactUrl = artifactUrl)
            requestSender.request { it.downloadAndExtractArtifact(request) }
        }()
    }

    private fun documentKey(editor: Editor): String =
        FileDocumentManager.getInstance().getFile(editor.document)?.url ?: "/dev/"

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
