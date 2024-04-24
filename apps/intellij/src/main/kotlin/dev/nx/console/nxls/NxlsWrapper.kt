package dev.nx.console.nxls

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import dev.nx.console.models.NxGeneratorOption
import dev.nx.console.models.NxGeneratorOptionDeserializer
import dev.nx.console.nxls.NxlsService.Companion.NX_WORKSPACE_REFRESH_TOPIC
import dev.nx.console.nxls.client.NxlsLanguageClient
import dev.nx.console.nxls.managers.DocumentManager
import dev.nx.console.nxls.managers.getFilePath
import dev.nx.console.nxls.server.NxlsLanguageServer
import dev.nx.console.utils.nxBasePath
import dev.nx.console.utils.nxlsWorkingPath
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executors
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import org.eclipse.lsp4j.*
import org.eclipse.lsp4j.jsonrpc.Launcher
import org.eclipse.lsp4j.jsonrpc.MessageConsumer
import org.eclipse.lsp4j.jsonrpc.messages.RequestMessage
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage

enum class NxlsState {
    STOPPED,
    STOPPING,
    STARTING,
    STARTED,
    FAILED
}

private val log = logger<NxlsWrapper>()

class NxlsWrapper(val project: Project, private val cs: CoroutineScope) {

    var languageServer: NxlsLanguageServer? = null
    var languageClient: NxlsLanguageClient? = null

    private val startedFuture = CompletableFuture<Void>()
    private var initializeFuture: CompletableFuture<InitializeResult>? = null
    private var initializeResult: InitializeResult? = null
    private var nxlsProcess: NxlsProcess? = null

    private var connectedEditors = HashMap<String, DocumentManager>()

    private var status = NxlsState.STOPPED

    fun getServerCapabilities(): ServerCapabilities? {
        log.info("Getting language server capabilities")
        return initializeResult?.capabilities
    }

    suspend fun start() {
        try {
            status = NxlsState.STARTING
            val nxlsProcess = NxlsProcess(project, cs)
            this.nxlsProcess = nxlsProcess
            val (input, output) =
                nxlsProcess.run {
                    start()
                    Pair(getInputStream(), getOutputStream())
                }

            nxlsProcess.callOnExit { cs.launch { stop() } }
            if (status !== NxlsState.STOPPED) {
                languageClient = NxlsLanguageClient()
                val executorService = Executors.newCachedThreadPool()

                Launcher.createIoLauncher(
                        languageClient,
                        NxlsLanguageServer::class.java,
                        input,
                        output,
                        executorService,
                        fun(consume: MessageConsumer): MessageConsumer {
                            return MessageConsumer { message ->
                                try {
                                    val response = message as? ResponseMessage
                                    response?.let {
                                        it.error?.let {
                                            log.trace("Error from nxls: ${it.message}")
                                        }
                                        it.result?.let { log.trace("Result from nxls: ${it}") }
                                    }

                                    val request = message as? RequestMessage
                                    request?.let {
                                        log.trace(
                                            "Sending request to nxls: ${it.method} (${it.params})"
                                        )
                                    }

                                    nxlsProcess.isAlive()?.run {
                                        if (this) {
                                            consume.consume(message)
                                        } else {
                                            log.info(
                                                "Unable to send messages to the nxls, the process has exited"
                                            )
                                            status = NxlsState.STOPPED
                                        }
                                    }
                                } catch (e: Throwable) {
                                    thisLogger().error(e)
                                }
                            }
                        },
                        fun(gson) {
                            gson.registerTypeAdapter(
                                NxGeneratorOption::class.java,
                                NxGeneratorOptionDeserializer()
                            )
                        }
                    )
                    .also {
                        languageServer = it.remoteProxy
                        it.startListening()
                    }

                initializeFuture = languageServer?.initialize(getInitParams())

                try {
                    initializeFuture?.await()
                    log.info("nxls Initialized")
                    project.messageBus
                        .syncPublisher(NX_WORKSPACE_REFRESH_TOPIC)
                        .onNxWorkspaceRefresh()
                } catch (e: Throwable) {
                    log.info(e.toString())
                }
            }
        } catch (e: Exception) {
            thisLogger().info("Cannot start nxls", e)
            status = NxlsState.FAILED
        } finally {
            status = NxlsState.STARTED
            startedFuture.complete(null)
            for ((_, manager) in connectedEditors) {
                connectTextService(manager)
            }
        }
    }

    suspend fun stop() {
        if (status == NxlsState.STOPPED || status == NxlsState.STOPPING) {
            return
        }
        status = NxlsState.STOPPING
        log.info("Stopping nxls")

        try {
            initializeFuture?.cancel(true)
            withTimeoutOrNull(1000L) { languageServer?.shutdown()?.await() }
        } catch (e: Throwable) {
            log.info("error while shutting down $e")
        } finally {
            languageServer?.exit()
            startedFuture.completeExceptionally(Exception("Nxls stopped"))
            for ((_, manager) in connectedEditors) {
                disconnect(manager.editor)
            }
            nxlsProcess?.stop()
            status = NxlsState.STOPPED
        }
    }

    fun isStarted(): Boolean {
        return status == NxlsState.STARTED
    }

    fun awaitStarted(): CompletableFuture<Void> {
        return if (isStarted()) {
            CompletableFuture.completedFuture(null)
        } else {
            startedFuture
        }
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

    private fun connectTextService(documentManager: DocumentManager) {
        log.info("Connecting textService to ${documentManager.documentPath}")
        val textService =
            languageServer?.textDocumentService ?: return log.info("text service not ready")
        documentManager.addTextDocumentService(textService)
        documentManager.documentOpened()
    }

    private fun getInitParams(): InitializeParams {
        val initParams = InitializeParams()
        initParams.workspaceFolders = listOf(WorkspaceFolder(nxlsWorkingPath(project.nxBasePath)))

        val workspaceClientCapabilities = WorkspaceClientCapabilities()
        workspaceClientCapabilities.applyEdit = true
        workspaceClientCapabilities.executeCommand = ExecuteCommandCapabilities()
        workspaceClientCapabilities.didChangeWatchedFiles = DidChangeWatchedFilesCapabilities()
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
