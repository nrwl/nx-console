package dev.nx.console.lsp.managers

import com.intellij.codeInsight.completion.InsertionContext
import com.intellij.codeInsight.lookup.AutoCompletionPolicy
import com.intellij.codeInsight.lookup.LookupElement
import com.intellij.codeInsight.lookup.LookupElementBuilder
import com.intellij.icons.AllIcons
import com.intellij.openapi.command.CommandProcessor
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.editor.Document
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.util.text.StringUtil
import dev.nx.console.utils.DocumentUtils
import dev.nx.console.utils.writeAction
import org.apache.commons.lang3.StringUtils
import org.eclipse.lsp4j.*
import org.eclipse.lsp4j.jsonrpc.messages.Either
import org.eclipse.lsp4j.services.TextDocumentService
import java.util.function.Consumer
import javax.swing.Icon

private val documentManagers = HashMap<String, DocumentManager>();
fun getDocumentManager(editor: Editor): DocumentManager {
  return documentManagers.getOrPut(getFilePath(editor.document) ?: "") {
    DocumentManager(editor)
  }
}


private val log = logger<DocumentManager>()

class DocumentManager(val editor: Editor) {

  var version = 0;
  val document = editor.document
  val documentPath = getFilePath(document);
  val identifier = TextDocumentIdentifier(getFilePath(document))
  val documentListener = object : DocumentListener {
    override fun documentChanged(event: DocumentEvent) {
      handleDocumentChanged(event, textDocumentService)
    }
  }


  private var textDocumentService: TextDocumentService? = null;

  fun handleDocumentChanged(event: DocumentEvent, textDocumentService: TextDocumentService?) {

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

    textDocumentService?.didChange(changesParams)

  }


  fun completions(pos: Position): Iterable<LookupElement> {
    val lookupItems = arrayListOf<LookupElement>()
    val service = textDocumentService ?: return lookupItems
    val request = service.completion(CompletionParams(identifier, pos))


    try {
      val res = request.get()
      for (item in res.right.items) {
        createLookupItem(this, item)?.let {
          lookupItems.add(it)
        }
      }

    } catch (e: Exception) {
      log.info(e);
    }

    return lookupItems;

  }

  fun documentOpened() {
    textDocumentService?.didOpen(
      DidOpenTextDocumentParams(
        TextDocumentItem(identifier.uri, "json", ++version, document.getText())
      )
    )
    addDocumentListener()
  }


  fun documentClosed() {
    removeDocumentListener()
    textDocumentService?.didClose(DidCloseTextDocumentParams(identifier))
    documentManagers.remove(getFilePath(document))
  }


  private fun addDocumentListener() {
    document.addDocumentListener(documentListener)
  }

  private fun removeDocumentListener() {
    document.removeDocumentListener(documentListener)
  }

  fun addTextDocumentService(textDocumentService: TextDocumentService) {
    this.textDocumentService = textDocumentService
  }
}

fun getFilePath(document: Document): String? {
  return FileDocumentManager.getInstance().getFile(document)?.url
}


fun createLookupItem(documentManager: DocumentManager, item: CompletionItem): LookupElement? {
  val detail = item.detail
  val insertText = item.insertText
  val kind = item.kind
  val label = item.label
  val textEdit = item.textEdit.left
  val insertReplaceEdit = item.textEdit.right
  val presentableText = if (StringUtils.isNotEmpty(label)) label else insertText ?: ""
  val tailText = detail ?: ""
//  val iconProvider: LSPIconProvider = GUIUtils.getIconProviderFor(wrapper.getServerDefinition())
//  val icon: Icon = iconProvider
  var lookupElementBuilder: LookupElementBuilder
  var lookupString: String? = null
  if (textEdit != null) {
    lookupString = textEdit.newText
  } else if (insertReplaceEdit != null) {
    lookupString = insertReplaceEdit.newText
  } else if (StringUtils.isNotEmpty(insertText)) {
    lookupString = insertText
  } else if (StringUtils.isNotEmpty(label)) {
    lookupString = label
  }
  if (StringUtils.isEmpty(lookupString)) {
    return null
  }

  lookupElementBuilder =
    LookupElementBuilder.create(convertPlaceHolders(lookupString!!)).withInsertHandler { context, _ ->
      applyInitialTextEdit(documentManager, item, context, lookupString)
      context.commitDocument()
    }.withIcon(getCompletionIcon(kind))

  if (kind == CompletionItemKind.Keyword) {
    lookupElementBuilder = lookupElementBuilder.withBoldness(true)
  }

  return lookupElementBuilder.withPresentableText(presentableText).withTypeText(tailText, true)
    .withAutoCompletionPolicy(AutoCompletionPolicy.SETTINGS_DEPENDENT)
}

private fun applyInitialTextEdit(
  documentManager: DocumentManager,
  item: CompletionItem,
  context: InsertionContext,
  lookupString: String,
) {
  // remove intellij edit, server is controlling insertion
  writeAction {
    val runnable = Runnable {
      context.document.deleteString(context.startOffset, context.tailOffset)
    }
    CommandProcessor.getInstance()
      .executeCommand(context.project, runnable, "Removing Intellij Completion", "LSPPlugin", context.document)
  }
  context.commitDocument()
  if (item.textEdit.isLeft) {
    item.textEdit.left.newText = convertPlaceHolders(lookupString)
  }
  applyEdit(documentManager, listOf(item.textEdit), "text edit")

}

private fun convertPlaceHolders(insertText: String): String {
  val SNIPPET_PLACEHOLDER_REGEX = "(\\$\\{\\d+:?([^{^}]*)}|\\$\\d+)";
  return insertText.replace(SNIPPET_PLACEHOLDER_REGEX.toRegex(), "")
}

fun applyEdit(
  documentManager: DocumentManager,
  edits: List<Either<TextEdit, InsertReplaceEdit>>,
  name: String?,
): Boolean {
  val runnable = getEditsRunnable(documentManager, edits)

  writeAction {
    if (runnable != null) {
      CommandProcessor.getInstance()
        .executeCommand(documentManager.editor.project, runnable, name, "LSPPlugin", documentManager.editor.document)
    }
  }
  return runnable != null
}

fun getEditsRunnable(
  documentManager: DocumentManager,
  edits: List<Either<TextEdit, InsertReplaceEdit>>
): Runnable? {


  if (documentManager.editor.isDisposed) {
    log.warn("Text edits couldn't be applied as the editor is already disposed.")
    return null
  }
  val document: Document = documentManager.editor.getDocument()
  if (!document.isWritable) {
    log.warn("Document is not writable")
    return null
  }
  return Runnable {
    val editor = documentManager.editor;
    // Creates a sorted edit list based on the insertion position and the edits will be applied from the bottom
    // to the top of the document. Otherwise all the other edit ranges will be invalid after the very first edit,
    // since the document is changed.
    val lspEdits: MutableList<LSPTextEdit> =
      ArrayList<LSPTextEdit>()
    edits.forEach(Consumer { edit: Either<TextEdit, InsertReplaceEdit> ->
      if (edit.isLeft) {
        val text = edit.left.newText
        val range = edit.left.range
        if (range != null) {
          val start: Int = DocumentUtils.LSPPosToOffset(editor, range.start)
          val end: Int = DocumentUtils.LSPPosToOffset(editor, range.end)
          lspEdits.add(LSPTextEdit(text, start, end))
        }
      } else if (edit.isRight) {
        val text = edit.right.newText
        var range = edit.right.insert
        if (range != null) {
          val start: Int = DocumentUtils.LSPPosToOffset(editor, range.start)
          val end: Int = DocumentUtils.LSPPosToOffset(editor, range.end)
          lspEdits.add(LSPTextEdit(text, start, end))
        } else if (edit.right.replace.also { range = it } != null) {
          val start: Int = DocumentUtils.LSPPosToOffset(editor, range!!.start)
          val end: Int = DocumentUtils.LSPPosToOffset(editor, range!!.end)
          lspEdits.add(LSPTextEdit(text, start, end))
        }
      }
    })

    lspEdits.sort()
    lspEdits.forEach { edit ->
      val text: String = edit.text
      val start: Int = edit.startOffset
      val end: Int = edit.endOffset
      if (end >= 0) {
        if (end - start <= 0) {
          document.insertString(start, text)
        } else {
          document.replaceString(start, end, text)
        }
      } else if (start == 0) {
        document.setText(text)
      } else if (start > 0) {
        document.insertString(start, text)
      }

      // TODO(cammisuli): make sure to place caret where snippet text was
      editor.caretModel.moveToOffset(start + text.length)

    }

    FileDocumentManager.getInstance().saveDocument(editor.document)
  }

}


private class LSPTextEdit constructor(val text: String, val startOffset: Int, val endOffset: Int) :
  Comparable<LSPTextEdit?> {


  override fun compareTo(other: LSPTextEdit?): Int {
    return (other?.startOffset ?: 0) - startOffset
  }

}

fun getCompletionIcon(kind: CompletionItemKind?): Icon? {
  kind ?: return null;

  return when (kind) {
    CompletionItemKind.Class -> AllIcons.Nodes.Class
    CompletionItemKind.Enum -> AllIcons.Nodes.Enum
    CompletionItemKind.Field -> AllIcons.Nodes.Field
    CompletionItemKind.File -> AllIcons.FileTypes.Any_type
    CompletionItemKind.Function -> AllIcons.Nodes.Function
    CompletionItemKind.Interface -> AllIcons.Nodes.Interface
    CompletionItemKind.Keyword -> AllIcons.Nodes.UpLevel
    CompletionItemKind.Method -> AllIcons.Nodes.Method
    CompletionItemKind.Module -> AllIcons.Nodes.Module
    CompletionItemKind.Property -> AllIcons.Nodes.Property
    CompletionItemKind.Reference -> AllIcons.Nodes.MethodReference
    CompletionItemKind.Snippet -> AllIcons.Nodes.Static
    CompletionItemKind.Text -> AllIcons.FileTypes.Text
    CompletionItemKind.Unit -> AllIcons.Nodes.Artifact
    CompletionItemKind.Variable -> AllIcons.Nodes.Variable
    CompletionItemKind.Value -> AllIcons.Nodes.Controller
    else -> null
  }
}





