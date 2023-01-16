package dev.nx.console.languageServer.managers

import com.intellij.openapi.editor.Document
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.util.text.StringUtil
import dev.nx.console.languageServer.NxlsLanguageServerWrapper
import dev.nx.console.utils.DocumentUtils
import org.eclipse.lsp4j.*

private val documentManagers = HashMap<String, DocumentManager>();
fun getOrCreateDocumentManager(editor: Editor, nxlsWrapper: NxlsLanguageServerWrapper) {
  documentManagers.getOrPut(getFilePath(editor.document) ?: "") {
    DocumentManager(editor, nxlsWrapper).apply {
      documentOpened()
    }
  }

}


class DocumentManager(val editor: Editor, val nxlsWrapper: NxlsLanguageServerWrapper) {

  var version = 0;
  val textDocumentService = nxlsWrapper.languageServer?.textDocumentService
  val document = editor.document
  val identifier = TextDocumentIdentifier(getFilePath(document))
  val documentListener = object : DocumentListener {
    override fun documentChanged(event: DocumentEvent) {
      handleDocumentChanged(event)
    }
  }

//  private val openedDocuments = HashSet<Document>();

  fun handleDocumentChanged(event: DocumentEvent) {
    // Nxls supports incremental text sync

    val changesParams =
      DidChangeTextDocumentParams(VersionedTextDocumentIdentifier(), listOf(TextDocumentContentChangeEvent()))
    changesParams.textDocument.uri = identifier.uri
    changesParams.textDocument.version = ++version

    val changeEvent = changesParams.contentChanges[0]
    val newText = event.newFragment
    val offset = event.offset
    val newTextLength = event.newLength
    val lspPosition: Position = DocumentUtils.offsetToLSPPos(editor, offset) ?: return
    val startLine = lspPosition.line
    val startColumn = lspPosition.character
    val oldText = event.oldFragment

    //if text was deleted/replaced, calculate the end position of inserted/deleted text

    //if text was deleted/replaced, calculate the end position of inserted/deleted text
    val endLine: Int
    val endColumn: Int
    if (oldText.length > 0) {
      endLine = startLine + StringUtil.countNewLines(oldText)
      val content = oldText.toString()
      val oldLines = content.split("\n".toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()
      val oldTextLength = if (oldLines.size == 0) 0 else oldLines[oldLines.size - 1].length
      endColumn =
        if (content.endsWith("\n")) 0 else if (oldLines.size == 1) startColumn + oldTextLength else oldTextLength
    } else { //if insert or no text change, the end position is the same
      endLine = startLine
      endColumn = startColumn
    }
    val range = Range(Position(startLine, startColumn), Position(endLine, endColumn))
    changeEvent.range = range
    changeEvent.rangeLength = newTextLength
    changeEvent.text = newText.toString()

  }

  fun documentOpened() {
    textDocumentService?.didOpen(
      DidOpenTextDocumentParams(
        TextDocumentItem(identifier.uri, "json", ++version, document.getText())
      )
    )
  }


  fun documentClosed(document: Document) {
//    openedDocuments.remove(document);
    textDocumentService?.didClose(DidCloseTextDocumentParams(identifier))
  }


  fun addDocumentListener() {
    document.addDocumentListener(documentListener)
  }

  fun removeDocumentListener() {
    document.removeDocumentListener(documentListener)
  }
}

fun getFilePath(document: Document): String? {
  return FileDocumentManager.getInstance().getFile(document)?.url
}



