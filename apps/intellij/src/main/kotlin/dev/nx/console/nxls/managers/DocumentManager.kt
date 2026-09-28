package dev.nx.console.nxls.managers

import com.intellij.codeInsight.lookup.LookupElement
import com.intellij.openapi.Disposable
import com.intellij.openapi.editor.Document
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.util.text.StringUtil
import dev.nx.console.completion.createLookupItem
import dev.nx.console.utils.DocumentUtils
import dev.nx.console.utils.NxConsoleLogger
import dev.nx.console.utils.computableReadAction
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.future.await
import kotlinx.coroutines.withTimeoutOrNull
import org.eclipse.lsp4j.*
import org.eclipse.lsp4j.services.TextDocumentService

private const val COMPLETION_TIMEOUT_MS = 10_000L
private const val HOVER_TIMEOUT_MS = 10_000L

private val documentManagers = ConcurrentHashMap<String, DocumentManager>()

private val log by lazy { NxConsoleLogger.getInstance() }

class DocumentManager(val editor: Editor) {

    companion object {
        fun getInstance(editor: Editor): DocumentManager {
            return documentManagers.computeIfAbsent(getFilePath(editor.document)) {
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
                handleDocumentChanged(event)
            }
        }

    private var documentListenerIsInstalled = false
    private var listenerDisposable: Disposable? = null

    private var textDocumentService: TextDocumentService? = null

    fun handleDocumentChanged(event: DocumentEvent) {

        val changesParams =
            DidChangeTextDocumentParams(
                VersionedTextDocumentIdentifier(),
                listOf(TextDocumentContentChangeEvent()),
            )
        changesParams.textDocument.uri = identifier.uri
        changesParams.textDocument.version = ++version

        val changeEvent = changesParams.contentChanges[0]
        val newText = event.newFragment
        val offset = event.offset
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
        changeEvent.text = newText.toString()

        textDocumentService?.didChange(changesParams)
    }

    fun completions(pos: Position): Iterable<LookupElement> {
        val lookupItems = arrayListOf<LookupElement>()
        val service = textDocumentService ?: return lookupItems
        val request = service.completion(CompletionParams(identifier, pos))

        try {
            val res = request.get(COMPLETION_TIMEOUT_MS, TimeUnit.MILLISECONDS)
            for (item in res.right.items) {
                createLookupItem(this, item)?.let { lookupItems.add(it) }
            }
        } catch (e: Exception) {
            request.cancel(true)
            log.error("Error getting completions", e)
        }

        return lookupItems
    }

    suspend fun hover(startOffset: Int): String? {
        return try {
            val pos = DocumentUtils.offsetToLSPPos(editor, startOffset) ?: return null
            val service = textDocumentService ?: return null
            val request = service.hover(HoverParams(identifier, pos))
            val hover = withTimeoutOrNull(HOVER_TIMEOUT_MS) { request.await() }
            val contents: String? =
                hover?.contents.let { it?.left?.joinToString { l -> l.left } ?: it?.right?.value }
            return contents?.replace("\\", "")?.ifEmpty { null }
        } catch (e: Exception) {
            log.error("Error getting hover info", e)
            null
        }
    }

    fun documentOpened() {
        val params =
            DidOpenTextDocumentParams(
                TextDocumentItem(
                    identifier.uri,
                    "json",
                    ++version,
                    computableReadAction { document.text },
                )
            )
        textDocumentService?.didOpen(params)
        addDocumentListener()
    }

    fun documentClosed() {
        removeDocumentListener()
        textDocumentService?.didClose(DidCloseTextDocumentParams(identifier))
        documentManagers.remove(getFilePath(document))
    }

    private fun addDocumentListener() {
        try {
            val disposable = Disposer.newDisposable()
            document.addDocumentListener(documentListener, disposable)
            listenerDisposable = disposable
            documentListenerIsInstalled = true
        } catch (exception: Throwable) {
            log.log("Document listener already registered for this document")
        }
    }

    private fun removeDocumentListener() {
        try {
            if (documentListenerIsInstalled) {
                listenerDisposable?.let { Disposer.dispose(it) }
                listenerDisposable = null
                documentListenerIsInstalled = false
            }
        } catch (exception: Throwable) {
            log.log("Document listener was not registered for this document")
        }
    }

    fun addTextDocumentService(textDocumentService: TextDocumentService) {
        this.textDocumentService = textDocumentService
    }
}

fun getFilePath(document: Document): String {
    return FileDocumentManager.getInstance().getFile(document)?.url ?: "/dev/"
}
