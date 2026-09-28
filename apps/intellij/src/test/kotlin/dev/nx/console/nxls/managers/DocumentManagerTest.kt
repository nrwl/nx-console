package dev.nx.console.nxls.managers

import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.editor.Editor
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals
import org.eclipse.lsp4j.DidChangeTextDocumentParams
import org.eclipse.lsp4j.DidCloseTextDocumentParams
import org.eclipse.lsp4j.DidOpenTextDocumentParams
import org.eclipse.lsp4j.DidSaveTextDocumentParams
import org.eclipse.lsp4j.services.TextDocumentService

private const val AWAIT_TIMEOUT_SECONDS = 30L

/**
 * Covers what [DocumentManager] puts on the wire.
 *
 * Keeping those messages off the dispatch thread is not its job. That happens below it, in the
 * message consumer the launcher is built with, and is covered against the real transport by
 * `dev.nx.console.nxls.NxlsTransportFreezeTest`.
 */
class DocumentManagerTest : BasePlatformTestCase() {

    private class RecordingTextDocumentService : TextDocumentService {
        val sent = LinkedBlockingQueue<String>()
        val opened = LinkedBlockingQueue<DidOpenTextDocumentParams>()
        val changed = LinkedBlockingQueue<DidChangeTextDocumentParams>()

        override fun didOpen(params: DidOpenTextDocumentParams) {
            sent.add("didOpen")
            opened.add(params)
        }

        override fun didChange(params: DidChangeTextDocumentParams) {
            sent.add("didChange")
            changed.add(params)
        }

        override fun didClose(params: DidCloseTextDocumentParams) {
            sent.add("didClose")
        }

        override fun didSave(params: DidSaveTextDocumentParams) {}
    }

    private lateinit var service: RecordingTextDocumentService
    private lateinit var editor: Editor
    private lateinit var manager: DocumentManager

    override fun setUp() {
        super.setUp()
        service = RecordingTextDocumentService()
        myFixture.configureByText("project.json", "{}")
        editor = myFixture.editor
        manager = DocumentManager.getInstance(editor)
        manager.addTextDocumentService(service)
    }

    override fun tearDown() {
        try {
            // DocumentManager keeps a process-wide cache keyed by file path, so the entry this
            // test created has to go before the next test configures the same fixture file.
            manager.documentClosed()
        } finally {
            super.tearDown()
        }
    }

    private fun nextSent(): String? = service.sent.poll(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS)

    fun testOpeningSendsTheCurrentText() {
        manager.documentOpened()

        assertEquals("didOpen", nextSent())
        val params = checkNotNull(service.opened.poll()) { "didOpen carried no parameters" }
        assertEquals("{}", params.textDocument.text)
        assertEquals(manager.identifier.uri, params.textDocument.uri)
    }

    fun testTypingSendsTheEditThatWasMade() {
        manager.documentOpened()
        assertEquals("didOpen", nextSent())

        WriteCommandAction.runWriteCommandAction(project) {
            editor.document.insertString(1, "\"name\"")
        }

        assertEquals("didChange", nextSent())
        val change =
            checkNotNull(service.changed.poll()) { "didChange carried no parameters" }
                .contentChanges
                .single()
        assertEquals("\"name\"", change.text)
        assertEquals(0, change.range.start.line)
        assertEquals(1, change.range.start.character)
    }

    fun testTheDocumentLifecycleIsSentInOrder() {
        manager.documentOpened()
        WriteCommandAction.runWriteCommandAction(project) {
            editor.document.insertString(1, "\"name\"")
        }
        manager.documentClosed()

        assertEquals(listOf("didOpen", "didChange", "didClose"), (1..3).map { nextSent() })
    }

    fun testClosingStopsReportingFurtherEdits() {
        manager.documentOpened()
        assertEquals("didOpen", nextSent())
        manager.documentClosed()
        assertEquals("didClose", nextSent())

        WriteCommandAction.runWriteCommandAction(project) {
            editor.document.insertString(1, "\"name\"")
        }

        assertEquals(0, service.sent.size)
    }
}
