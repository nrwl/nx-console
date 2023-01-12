package dev.nx.console.languageServer

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import org.eclipse.lsp4j.*

import org.eclipse.lsp4j.jsonrpc.Launcher
import org.eclipse.lsp4j.services.LanguageServer
import java.util.concurrent.CompletableFuture

private val logger = logger<NxlsLanguageServerWrapper>()

class NxlsLanguageServerWrapper(val project: Project) {

  var languageServer: LanguageServer? = null
  var languageClient: NxlsLanguageClient? = null
  private var initializeResult: InitializeResult? = null
  private var initializeFuture: CompletableFuture<InitializeResult>? = null

  private var connectedEditors = HashSet<Editor>()

  private var basePath: String = project.basePath ?: throw IllegalStateException("Cannot get the project base path")

  fun getServerCapabilities(): ServerCapabilities? {
    logger.info("Getting language server capabilities")
    return initializeResult?.capabilities
  }

  fun start() {
    val (input, output) = NxlsProcess(basePath).run {
      start()
      Pair(getInputStream(), getOutputStream())
    }

    languageClient = NxlsLanguageClient();
    Launcher.createLauncher(languageClient, LanguageServer::class.java, input, output).let {
      languageServer = it.remoteProxy
      it.startListening()
    };

    initializeFuture = languageServer?.initialize(getInitParams())?.thenApply {
      initializeResult = it
      it
    }
  }

  fun connect(editor: Editor) {

    initializeFuture?.thenRun {
      if (connectedEditors.contains(editor)) {
        return@thenRun
      }


      connectedEditors.add(editor)


    }

  }

  fun disconnect(editor: Editor) {
    connectedEditors.remove(editor);
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
