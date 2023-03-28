package dev.nx.console.nxls

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import dev.nx.console.nxls.client.NxlsLanguageClient
import dev.nx.console.nxls.managers.DocumentManager
import dev.nx.console.nxls.managers.getFilePath
import dev.nx.console.nxls.server.NxlsLanguageServer
import dev.nx.console.services.NxlsService.Companion.NX_WORKSPACE_REFRESH_TOPIC
import dev.nx.console.utils.nxBasePath
import dev.nx.console.utils.nxWorkspace
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.future.await
import org.eclipse.lsp4j.*
import org.eclipse.lsp4j.jsonrpc.Launcher
import org.eclipse.lsp4j.jsonrpc.MessageConsumer
import org.eclipse.lsp4j.jsonrpc.messages.RequestMessage
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage

enum class NxlsState {
    STOPPED,
    STARTING,
    STARTED,
    FAILED
}

private val log = logger<NxlsWrapper>()

class NxlsWrapper(val project: Project) {

    var languageServer: NxlsLanguageServer? = null
    var languageClient: NxlsLanguageClient? = null
    private var initializeResult: InitializeResult? = null
    private var initializeFuture: CompletableFuture<InitializeResult>? = null

    private var connectedEditors = HashMap<String, DocumentManager>()

    private var status = NxlsState.STOPPED

    fun getServerCapabilities(): ServerCapabilities? {
        log.info("Getting language server capabilities")
        return initializeResult?.capabilities
    }

    suspend fun start() {

        try {
            status = NxlsState.STARTING
            val (input, output) =
                NxlsProcess(project).run {
                    start()
                    Pair(getInputStream(), getOutputStream())
                }
            languageClient = NxlsLanguageClient()
            val executorService = Executors.newCachedThreadPool()

            Launcher.createLauncher(
                    languageClient,
                    NxlsLanguageServer::class.java,
                    input,
                    output,
                    executorService
                ) { consume ->
                    MessageConsumer { message ->
                        val response = message as? ResponseMessage
                        response?.let {
                            it.error?.let { log.trace("Error from nxls: ${it.message}") }
                            it.result?.let { log.trace("Result from nxls: ${it}") }
                        }

                        val request = message as? RequestMessage
                        request?.let {
                            log.trace("Sending request to nxls: ${it.method} (${it.params})")
                        }
                        consume.consume(message)
                    }
                }
                .also {
                    languageServer = it.remoteProxy
                    it.startListening()
                }

            initializeResult = languageServer?.initialize(getInitParams())?.await()
            log.info("Initialized")
            project.nxWorkspace()?.run {
                project.messageBus.syncPublisher(NX_WORKSPACE_REFRESH_TOPIC).onNxWorkspaceRefresh()
            }
        } catch (e: Exception) {
            thisLogger().info("Cannot start nxls", e)
            status = NxlsState.FAILED
        } finally {
            status = NxlsState.STARTED
            for ((_, manager) in connectedEditors) {
                connectTextService(manager)
            }
        }
    }

    fun stop() {
        log.info("Stopping nxls")

        initializeFuture?.cancel(true)
        languageServer?.shutdown()?.get(5000, TimeUnit.MILLISECONDS)
        languageServer?.exit()
    }

    fun connect(editor: Editor) {

        val documentManager = DocumentManager.getInstance(editor)
        if (status == NxlsState.STARTED) {
            if (!connectedEditors.containsKey(getFilePath(editor.document))) {
                connectTextService(documentManager)
            }
        } else {
            log.info("Nxls not ready for documents yet.. ")
        }

        connectedEditors.put(getFilePath(editor.document), documentManager)
    }

    private fun connectTextService(documentManager: DocumentManager) {
        log.info("Connecting textService to ${documentManager.documentPath}")
        val textService =
            languageServer?.textDocumentService ?: return log.info("text service not ready")
        documentManager.addTextDocumentService(textService)
        documentManager.documentOpened()
    }

    fun disconnect(editor: Editor) {
        val filePath = getFilePath(editor.document)
        val documentManager =
            connectedEditors.get(filePath)
                ?: return log.info("editor not part of connected editors")
        documentManager.documentClosed()
        connectedEditors.remove(filePath)
        log.info("Disconnected ${documentManager.documentPath}")
    }

    fun isEditorConnected(editor: Editor): Boolean {
        val filePath = getFilePath(editor.document)
        return connectedEditors.contains(filePath)
    }

    fun getInitParams(): InitializeParams {
        val initParams = InitializeParams()
        initParams.rootUri = project.nxBasePath
        initParams.workspaceFolders = listOf(WorkspaceFolder(project.nxBasePath))

        val workspaceClientCapabilities = WorkspaceClientCapabilities()
        workspaceClientCapabilities.applyEdit = true
        workspaceClientCapabilities.didChangeWatchedFiles = DidChangeWatchedFilesCapabilities()
        workspaceClientCapabilities.executeCommand = ExecuteCommandCapabilities()
        workspaceClientCapabilities.workspaceEdit = WorkspaceEditCapabilities()
        workspaceClientCapabilities.symbol = SymbolCapabilities()
        workspaceClientCapabilities.workspaceFolders = false
        workspaceClientCapabilities.configuration = false

        val textDocumentClientCapabilities = TextDocumentClientCapabilities()
        textDocumentClientCapabilities.codeAction = CodeActionCapabilities()
        textDocumentClientCapabilities.codeAction.codeActionLiteralSupport =
            CodeActionLiteralSupportCapabilities()
        textDocumentClientCapabilities.completion =
            CompletionCapabilities(CompletionItemCapabilities(true))
        textDocumentClientCapabilities.definition = DefinitionCapabilities()
        textDocumentClientCapabilities.documentHighlight = DocumentHighlightCapabilities()
        textDocumentClientCapabilities.formatting = FormattingCapabilities()
        textDocumentClientCapabilities.hover = HoverCapabilities()
        textDocumentClientCapabilities.onTypeFormatting = OnTypeFormattingCapabilities()
        textDocumentClientCapabilities.rangeFormatting = RangeFormattingCapabilities()
        textDocumentClientCapabilities.references = ReferencesCapabilities()
        textDocumentClientCapabilities.rename = RenameCapabilities()
        textDocumentClientCapabilities.signatureHelp = SignatureHelpCapabilities()
        textDocumentClientCapabilities.synchronization =
            SynchronizationCapabilities(true, true, true)
        initParams.capabilities =
            ClientCapabilities(workspaceClientCapabilities, textDocumentClientCapabilities, null)

        return initParams
    }
}
