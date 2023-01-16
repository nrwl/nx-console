package dev.nx.console.lsp

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import dev.nx.console.lsp.client.NxlsLanguageClient
import dev.nx.console.lsp.managers.DocumentManager
import dev.nx.console.lsp.managers.getOrCreateDocumentManager
import dev.nx.console.lsp.server.NxlsLanguageServer
import kotlinx.coroutines.future.await
import org.eclipse.lsp4j.*
import org.eclipse.lsp4j.jsonrpc.Launcher
import org.eclipse.lsp4j.jsonrpc.MessageConsumer
import org.eclipse.lsp4j.jsonrpc.messages.Message
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit


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
  private var basePath: String = project.basePath ?: throw IllegalStateException("Cannot get the project base path")

  private var connectedEditors = HashMap<Editor, DocumentManager>()

  private var status = NxlsState.STOPPED;

  fun getServerCapabilities(): ServerCapabilities? {
    log.info("Getting language server capabilities")
    return initializeResult?.capabilities
  }

  suspend fun start() {

    try {
      status = NxlsState.STARTING
      val (input, output) = NxlsProcess(basePath).run {
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
//          log.info("$message");
          consume.consume(message);
        }
      }
        .also {
          languageServer = it.remoteProxy
          it.startListening()
        };

      initializeResult = languageServer?.initialize(getInitParams())?.await()

    } catch (e: Exception) {
      thisLogger().info("Cannot start nxls", e);
      status = NxlsState.FAILED
    } finally {
      log.info("Initialized")
      status = NxlsState.STARTED
      for ((_, manager) in connectedEditors) {
        connectTextService(manager);
      }
    }
  }

  fun stop() {
    log.info("Stopping nxls")

    initializeFuture?.cancel(true);
    languageServer?.shutdown()?.get(5000, TimeUnit.MILLISECONDS)
    languageServer?.exit()
  }

  fun connect(editor: Editor) {

    val documentManager = getOrCreateDocumentManager(editor)
    if (status == NxlsState.STARTED) {

      connectTextService(documentManager);
    } else {
      log.info("Nxls not ready for documents yet.. ")
    }

    connectedEditors.put(editor, documentManager)


  }

  private fun connectTextService(documentManager: DocumentManager) {
    log.info("Connecting textService to ${documentManager.documentPath}")
    val textService = languageServer?.textDocumentService ?: return log.info("text service not ready");
    documentManager.addTextDocumentService(textService)
    documentManager.documentOpened()
  }

  fun disconnect(editor: Editor) {
    val documentManager = connectedEditors.get(editor) ?: return log.info("editor not part of connected editors")
    documentManager.documentClosed();
    connectedEditors.remove(editor);
    log.info("Disconnected ${documentManager.documentPath}")
  }

  fun getInitParams(): InitializeParams {
    val initParams = InitializeParams()
    initParams.rootUri = basePath;

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
    textDocumentClientCapabilities.codeAction.codeActionLiteralSupport = CodeActionLiteralSupportCapabilities()
    textDocumentClientCapabilities.completion = CompletionCapabilities(CompletionItemCapabilities(true))
    textDocumentClientCapabilities.definition = DefinitionCapabilities()
    textDocumentClientCapabilities.documentHighlight = DocumentHighlightCapabilities()
    textDocumentClientCapabilities.formatting = FormattingCapabilities()
    textDocumentClientCapabilities.hover = HoverCapabilities()
    textDocumentClientCapabilities.onTypeFormatting = OnTypeFormattingCapabilities()
    textDocumentClientCapabilities.rangeFormatting = RangeFormattingCapabilities()
    textDocumentClientCapabilities.references = ReferencesCapabilities()
    textDocumentClientCapabilities.rename = RenameCapabilities()
    textDocumentClientCapabilities.signatureHelp = SignatureHelpCapabilities()
    textDocumentClientCapabilities.synchronization = SynchronizationCapabilities(true, true, true)
    initParams.capabilities = ClientCapabilities(workspaceClientCapabilities, textDocumentClientCapabilities, null)

    return initParams
  }

}
