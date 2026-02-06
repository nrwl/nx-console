package dev.nx.console.nxls

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.openapi.project.Project
import dev.nx.console.models.NxGeneratorOption
import dev.nx.console.models.NxGeneratorOptionDeserializer
import dev.nx.console.nxls.client.NxlsLanguageClient
import dev.nx.console.nxls.managers.DocumentManager
import dev.nx.console.nxls.managers.getFilePath
import dev.nx.console.nxls.server.NxlsLanguageServer
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.utils.NxConsoleLogger
import dev.nx.console.utils.nxBasePath
import dev.nx.console.utils.nxlsWorkingPath
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
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
    FAILED,
}

private val log by lazy { NxConsoleLogger.getInstance() }

class NxlsWrapper(val project: Project, private val cs: CoroutineScope) {

    var languageServer: NxlsLanguageServer? = null
    var languageClient: NxlsLanguageClient? = null

    private val startedFuture = CompletableFuture<Void>()
    private var initializeFuture: CompletableFuture<InitializeResult>? = null
    private var initializeResult: InitializeResult? = null
    private var nxlsProcess: NxlsProcess? = null

    private var connectedEditors = ConcurrentHashMap<String, DocumentManager>()

    private var status = NxlsState.STOPPED

    fun getServerCapabilities(): ServerCapabilities? {
        log.log("Getting language server capabilities")
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
                                    val debugEnabled =
                                        NxConsoleSettingsProvider.getInstance().enableDebugLogging
                                    val response = message as? ResponseMessage
                                    response?.let {
                                        it.error?.let {
                                            log.error("Error from nxls: ${it.message}")
                                        }
                                        it.result?.let { result ->
                                            val resultStr = result.toString()
                                            val logMessage =
                                                if (debugEnabled || resultStr.length <= 100)
                                                    resultStr
                                                else resultStr.substring(0, 100)
                                            log.log("Result from nxls: $logMessage")
                                        }
                                    }

                                    val request = message as? RequestMessage
                                    request?.let { request ->
                                        val paramsStr = request.params?.toString()
                                        val paramsLog =
                                            if (paramsStr == null) null
                                            else if (debugEnabled || paramsStr.length <= 100)
                                                paramsStr
                                            else paramsStr.substring(0, 100)
                                        log.log(
                                            "Sending request to nxls: ${request.method} ($paramsLog)"
                                        )
                                    }

                                    nxlsProcess.isAlive()?.run {
                                        if (this) {
                                            consume.consume(message)
                                        } else {
                                            log.log(
                                                "Unable to send messages to the nxls, the process has exited"
                                            )
                                            status = NxlsState.STOPPED
                                        }
                                    }
                                } catch (e: Throwable) {
                                    log.error("Error in nxls message consumer", e)
                                }
                            }
                        },
                        fun(gson) {
                            gson.registerTypeAdapter(
                                NxGeneratorOption::class.java,
                                NxGeneratorOptionDeserializer(),
                            )
                            //                            gson.registerTypeAdapter(
                            //                                SourceInformation::class.java,
                            //                                SourceInformationDeserializer(),
                            //                            )
                        },
                    )
                    .also {
                        languageServer = it.remoteProxy
                        it.startListening()
                    }

                initializeFuture = languageServer?.initialize(getInitParams())

                try {
                    initializeFuture?.await()
                    log.log("nxls Initialized")
                    // Don't publish NX_WORKSPACE_REFRESH_TOPIC here - nxls will send
                    // NxWorkspaceRefreshNotification after reconfigure completes, which
                    // triggers the registerRefreshCallback to publish the topic
                } catch (e: Throwable) {
                    log.error("Error during nxls initialization", e)
                }
            }
        } catch (e: Exception) {
            log.error("Cannot start nxls", e)
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
        log.log("Stopping nxls")

        try {
            ApplicationManager.getApplication().invokeAndWait {
                for ((_, manager) in connectedEditors) {
                    disconnect(manager.editor)
                }
            }
            initializeFuture?.cancel(true)
            withTimeoutOrNull(1000L) { languageServer?.shutdown()?.await() }
        } catch (e: Throwable) {
            if (e is ProcessCanceledException) {
                throw e
            } else {
                log.error("Error while shutting down nxls", e)
            }
        } finally {
            languageServer?.exit()
            startedFuture.completeExceptionally(Exception("Nxls stopped"))

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
            log.log("Nxls not ready for documents yet.. ")
        }

        connectedEditors.put(getFilePath(editor.document), documentManager)
    }

    fun disconnect(editor: Editor) {
        val filePath = getFilePath(editor.document)
        val documentManager =
            connectedEditors.get(filePath) ?: return log.log("editor not part of connected editors")
        documentManager.documentClosed()
        connectedEditors.remove(filePath)
        log.log("Disconnected ${documentManager.documentPath}")
    }

    fun isEditorConnected(editor: Editor): Boolean {
        val filePath = getFilePath(editor.document)
        return connectedEditors.contains(filePath)
    }

    private fun connectTextService(documentManager: DocumentManager) {
        log.log("Connecting textService to ${documentManager.documentPath}")
        val textService =
            languageServer?.textDocumentService ?: return log.log("text service not ready")
        documentManager.addTextDocumentService(textService)
        documentManager.documentOpened()
    }

    private fun getInitParams(): InitializeParams {
        val initParams = InitializeParams()
        initParams.workspaceFolders =
            listOf(WorkspaceFolder(nxlsWorkingPath(project.nxBasePath), "nx-workspace"))

        initParams.initializationOptions =
            mapOf(
                "workspacePath" to nxlsWorkingPath(project.nxBasePath),
                "enableDebugLogging" to NxConsoleSettingsProvider.getInstance().enableDebugLogging,
            )

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
