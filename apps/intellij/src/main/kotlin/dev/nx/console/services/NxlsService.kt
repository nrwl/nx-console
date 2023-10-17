package dev.nx.console.services

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.util.messages.Topic
import dev.nx.console.generate.ui.GenerateUiStartupMessageDefinition
import dev.nx.console.generate.ui.GeneratorSchema
import dev.nx.console.models.*
import dev.nx.console.nxls.NxlsWrapper
import dev.nx.console.nxls.client.NxlsLanguageClient
import dev.nx.console.nxls.server.*
import dev.nx.console.nxls.server.requests.*
import dev.nx.console.ui.Notifier
import dev.nx.console.utils.nxlsWorkingPath
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch
import org.eclipse.lsp4j.jsonrpc.MessageIssueException
import org.eclipse.lsp4j.jsonrpc.ResponseErrorException

private val logger = logger<NxlsService>()

class NxlsService(val project: Project) {
    private var wrapper: NxlsWrapper = NxlsWrapper(project)

    private fun client(): NxlsLanguageClient? {
        return wrapper.languageClient
    }

    private fun server(): NxlsLanguageServer? {
        if (!wrapper.isStarted()) {
            return null
        }
        return wrapper.languageServer
    }

    suspend fun start() {
        wrapper.start()
        client()?.registerRefreshCallback {
            CoroutineScope(Dispatchers.Default).launch {
                workspace().run {
                    project.messageBus
                        .syncPublisher(NX_WORKSPACE_REFRESH_TOPIC)
                        .onNxWorkspaceRefresh()
                }
            }
        }
    }

    fun close() {
        wrapper.stop()
    }

    fun refreshWorkspace() {
        CoroutineScope(Dispatchers.Default).launch {
            if (!wrapper.isStarted()) {
                start()
            }

            workspace().run {
                project.messageBus.syncPublisher(NX_WORKSPACE_REFRESH_TOPIC).onNxWorkspaceRefresh()
            }
        }
        server()?.getNxService()?.refreshWorkspace()
    }

    suspend fun workspace(): NxWorkspace? {
        return withMessageIssueCatch { server()?.getNxService()?.workspace()?.await() }()
    }

    suspend fun generators(): List<NxGenerator> {
        return withMessageIssueCatch { server()?.getNxService()?.generators()?.await() }()
            ?: emptyList()
    }

    suspend fun generatorOptions(
        requestOptions: NxGeneratorOptionsRequestOptions
    ): List<NxGeneratorOption> {
        return withMessageIssueCatch {
            val request = NxGeneratorOptionsRequest(requestOptions)
            server()?.getNxService()?.generatorOptions(request)?.await()
        }()
            ?: emptyList()
    }

    suspend fun generatorContextFromPath(
        generator: NxGenerator? = null,
        path: String?
    ): NxGeneratorContext? {
        return withMessageIssueCatch {
            val request = NxGetGeneratorContextFromPathRequest(path)
            server()?.getNxService()?.generatorContextV2(request)?.await()
        }()
    }

    suspend fun projectsByPaths(paths: Array<String>): Map<String, NxProject> {
        val request = NxProjectsByPathsRequest(paths)
        return withMessageIssueCatch {
            server()?.getNxService()?.projectsByPaths(request)?.await()
        }()
            ?: emptyMap()
    }

    suspend fun projectGraphOutput(): ProjectGraphOutput? {
        return withMessageIssueCatch { server()?.getNxService()?.projectGraphOutput()?.await() }()
    }

    suspend fun createProjectGraph(showAffected: Boolean = false): CreateProjectGraphError? {
        return withMessageIssueCatch {
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
        return withMessageIssueCatch {
            server()?.getNxService()?.projectFolderTree()?.await()?.toFolderTreeData()
        }()
    }

    suspend fun transformedGeneratorSchema(schema: GeneratorSchema): GeneratorSchema {
        return withMessageIssueCatch {
            server()?.getNxService()?.transformedGeneratorSchema(schema)?.await()
        }()
            ?: schema
    }

    suspend fun startupMessage(schema: GeneratorSchema): GenerateUiStartupMessageDefinition? {
        return withMessageIssueCatch { server()?.getNxService()?.startupMessage(schema)?.await() }()
    }

    suspend fun nxVersion(): NxVersion? {
        return this.workspace()?.nxVersion
    }

    fun addDocument(editor: Editor) {
        wrapper.connect(editor)
    }

    fun removeDocument(editor: Editor) {
        wrapper.disconnect(editor)
    }

    fun changeWorkspace(workspacePath: String) {
        server()?.getNxService()?.changeWorkspace(nxlsWorkingPath(workspacePath))
    }

    fun isEditorConnected(editor: Editor): Boolean {
        return wrapper.isEditorConnected(editor)
    }

    fun runAfterStarted(block: Runnable) {
        wrapper.initializeFuture?.thenRun(block)
    }

    private fun <T> withMessageIssueCatch(block: suspend () -> T): suspend () -> T? {
        return {
            try {
                block()
            } catch (e: MessageIssueException) {
                Notifier.notifyLspMessageIssueExceptionThrottled(project, e)
                null
            }
        }
    }

    companion object {
        fun getInstance(project: Project): NxlsService = project.getService(NxlsService::class.java)
        val NX_WORKSPACE_REFRESH_TOPIC: Topic<NxWorkspaceRefreshListener> =
            Topic("NxWorkspaceRefresh", NxWorkspaceRefreshListener::class.java)
    }
}

interface NxWorkspaceRefreshListener {
    fun onNxWorkspaceRefresh()
}
