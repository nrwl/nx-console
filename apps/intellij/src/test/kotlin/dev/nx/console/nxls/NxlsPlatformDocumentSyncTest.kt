package dev.nx.console.nxls

import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.editor.Editor
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.nxls.server.NxlsLanguageServer
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals
import org.eclipse.lsp4j.DidChangeTextDocumentParams
import org.eclipse.lsp4j.DidCloseTextDocumentParams
import org.eclipse.lsp4j.DidOpenTextDocumentParams
import org.eclipse.lsp4j.DidSaveTextDocumentParams
import org.eclipse.lsp4j.jsonrpc.services.ServiceEndpoints
import org.eclipse.lsp4j.services.TextDocumentService

private const val AWAIT_TIMEOUT_SECONDS = 30L

class NxlsPlatformDocumentSyncTest : BasePlatformTestCase() {

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
    private lateinit var harness: SdkLspTestHarness

    override fun setUp() {
        super.setUp()
        service = RecordingTextDocumentService()
        myFixture.configureFromExistingVirtualFile(
            myFixture.addFileToProject("project.json", "{}").virtualFile
        )
        editor = myFixture.editor
        val remote =
            ServiceEndpoints.toServiceObject(
                ServiceEndpoints.toEndpoint(service),
                NxlsLanguageServer::class.java,
            )
        harness = SdkLspTestHarness(project, myFixture.file.virtualFile.parent, remote)
    }

    override fun tearDown() {
        try {
            harness.close()
        } finally {
            super.tearDown()
        }
    }

    private fun nextSent(): String? = service.sent.poll(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS)

    fun testOpeningSendsTheCurrentText() {
        harness.open(myFixture.file.virtualFile)

        assertEquals("didOpen", nextSent())
        val params = checkNotNull(service.opened.poll()) { "didOpen carried no parameters" }
        assertEquals("{}", params.textDocument.text)
        assertEquals(
            harness.server.getDocumentIdentifier(myFixture.file.virtualFile).uri,
            params.textDocument.uri,
        )
    }

    fun testTypingSendsTheEditThatWasMade() {
        harness.open(myFixture.file.virtualFile)
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
        harness.open(myFixture.file.virtualFile)
        WriteCommandAction.runWriteCommandAction(project) {
            editor.document.insertString(1, "\"name\"")
        }
        harness.close(myFixture.file.virtualFile)

        assertEquals(listOf("didOpen", "didChange", "didClose"), (1..3).map { nextSent() })
    }

    fun testClosingStopsReportingFurtherEdits() {
        harness.open(myFixture.file.virtualFile)
        assertEquals("didOpen", nextSent())
        harness.close(myFixture.file.virtualFile)
        assertEquals("didClose", nextSent())

        WriteCommandAction.runWriteCommandAction(project) {
            editor.document.insertString(1, "\"name\"")
        }

        harness.drain()
        assertEquals(0, service.sent.size)
    }
}
