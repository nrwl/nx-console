package dev.nx.console.nxls.managers

import com.intellij.codeInsight.lookup.LookupElement
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.editor.Document
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.util.text.StringUtil
import dev.nx.console.completion.createLookupItem
import dev.nx.console.utils.DocumentUtils
import kotlinx.coroutines.future.await
import org.eclipse.lsp4j.*
import org.eclipse.lsp4j.services.TextDocumentService

private val documentManagers = HashMap<String, DocumentManager>()

private val log = logger<DocumentManager>()

class DocumentManager(val editor: Editor) {

    companion object {
        fun getInstance(editor: Editor): DocumentManager {
            return documentManagers.getOrPut(getFilePath(editor.document)) {
                DocumentManager(editor)
            }
        }
    }

    var version = 0
    val document = editor.document
    val documentPath = getFilePath(document)
    val identifier = TextDocumentIdentifier(getFilePath(document))
    val documentListener =
        object : DocumentListener {
            override fun documentChanged(event: DocumentEvent) {
                handleDocumentChanged(event, textDocumentService)
            }
        }

    private var textDocumentService: TextDocumentService? = null

    fun handleDocumentChanged(event: DocumentEvent, textDocumentService: TextDocumentService?) {

        val changesParams =
            DidChangeTextDocumentParams(
                VersionedTextDocumentIdentifier(),
                listOf(TextDocumentContentChangeEvent())
            )
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

        // if text was deleted/replaced, calculate the end position of inserted/deleted text
        val endLine: Int
        val endColumn: Int
        if (oldText.length > 0) {
            endLine = startLine + StringUtil.countNewLines(oldText)
            val content = oldText.toString()
            val oldLines =
                content.split("\n".toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()
            val oldTextLength = if (oldLines.size == 0) 0 else oldLines[oldLines.size - 1].length
            endColumn =
                if (content.endsWith("\n")) 0
                else if (oldLines.size == 1) startColumn + oldTextLength else oldTextLength
        } else { // if insert or no text change, the end position is the same
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
                createLookupItem(this, item)?.let { lookupItems.add(it) }
            }
        } catch (e: Exception) {
            thisLogger().info(e)
        }

        return lookupItems
    }

    suspend fun hover(startOffset: Int): String? {
        val pos = DocumentUtils.offsetToLSPPos(editor, startOffset)
        val request = textDocumentService?.hover(HoverParams(identifier, pos))
        return try {
            return request
                ?.await()
                ?.contents
                ?.left
                ?.joinToString { it.left }
                ?.replace("\\", "")
                ?.ifEmpty { null }
        } catch (e: Exception) {
            thisLogger().info(e)
            null
        }
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
        try {
            document.addDocumentListener(documentListener)
        } catch (exception: Exception) {
            log.info("Document listener already registered for this document")
        }
    }

    private fun removeDocumentListener() {
        try {
            document.removeDocumentListener(documentListener)
        } catch (exception: Exception) {
            log.info("Document listener was not registered for this document")
        }
    }

    fun addTextDocumentService(textDocumentService: TextDocumentService) {
        this.textDocumentService = textDocumentService
    }
}

fun getFilePath(document: Document): String {
    return FileDocumentManager.getInstance().getFile(document)?.url ?: "/dev/"
}
