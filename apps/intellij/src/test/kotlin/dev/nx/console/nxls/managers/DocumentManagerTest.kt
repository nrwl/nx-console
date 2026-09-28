package dev.nx.console.nxls.managers

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.editor.Editor
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.nxls.LspNotificationQueue
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CountDownLatch
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import kotlin.system.measureTimeMillis
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import org.eclipse.lsp4j.CompletionItem
import org.eclipse.lsp4j.CompletionList
import org.eclipse.lsp4j.CompletionParams
import org.eclipse.lsp4j.DidChangeTextDocumentParams
import org.eclipse.lsp4j.DidCloseTextDocumentParams
import org.eclipse.lsp4j.DidOpenTextDocumentParams
import org.eclipse.lsp4j.DidSaveTextDocumentParams
import org.eclipse.lsp4j.Position
import org.eclipse.lsp4j.jsonrpc.messages.Either
import org.eclipse.lsp4j.services.TextDocumentService

private const val AWAIT_TIMEOUT_SECONDS = 30L

/** How long a stalled send parks for, standing in for a language server that stopped reading. */
private const val STALLED_SEND_TIMEOUT_SECONDS = 20L

/** Long enough that a message skipping the queue would visibly arrive out of order. */
private const val SLOW_NOTIFICATION_MS = 1500L

/**
 * A send that reaches the language server process writes into its stdin pipe and blocks until the
 * server drains it. These tests hold that write open and assert that the thread which triggered the
 * notification is free to carry on, because in the IDE that thread is the EDT.
 */
class DocumentManagerTest : BasePlatformTestCase() {

    private class StallingTextDocumentService : TextDocumentService {
        val opened = LinkedBlockingQueue<DidOpenTextDocumentParams>()
        val changed = LinkedBlockingQueue<DidChangeTextDocumentParams>()
        val closed = LinkedBlockingQueue<DidCloseTextDocumentParams>()
        val sendOrder = LinkedBlockingQueue<String>()

        @Volatile private var stall: CountDownLatch? = null
        @Volatile private var notificationSendMillis = 0L
        private val reachedStall = CountDownLatch(1)

        fun stallSends() {
            stall = CountDownLatch(1)
        }

        /** Makes notifications, but not requests, take a while to reach the server. */
        fun slowDownNotifications(millis: Long) {
            notificationSendMillis = millis
        }

        fun awaitStalledSend(): Boolean =
            reachedStall.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS)

        fun releaseSends() {
            stall?.countDown()
        }

        private fun <T> record(
            name: String,
            target: LinkedBlockingQueue<T>,
            params: T,
            isNotification: Boolean,
        ) {
            stall?.let {
                reachedStall.countDown()
                it.await(STALLED_SEND_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            }
            if (isNotification && notificationSendMillis > 0) {
                Thread.sleep(notificationSendMillis)
            }
            sendOrder.add(name)
            target.add(params)
        }

        override fun didOpen(params: DidOpenTextDocumentParams) =
            record("didOpen", opened, params, isNotification = true)

        override fun didChange(params: DidChangeTextDocumentParams) =
            record("didChange", changed, params, isNotification = true)

        override fun didClose(params: DidCloseTextDocumentParams) =
            record("didClose", closed, params, isNotification = true)

        override fun didSave(params: DidSaveTextDocumentParams) {}

        override fun completion(
            params: CompletionParams
        ): CompletableFuture<Either<MutableList<CompletionItem>, CompletionList>> {
            record("completion", LinkedBlockingQueue(), params, isNotification = false)
            return CompletableFuture.completedFuture(Either.forRight(CompletionList()))
        }
    }

    private lateinit var scope: CoroutineScope
    private lateinit var service: StallingTextDocumentService
    private lateinit var editor: Editor
    private lateinit var manager: DocumentManager

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        service = StallingTextDocumentService()
        myFixture.configureByText("project.json", "{}")
        editor = myFixture.editor
        manager = DocumentManager.getInstance(editor)
        manager.addTextDocumentService(service, LspNotificationQueue(scope))
    }

    override fun tearDown() {
        try {
            service.releaseSends()
            // DocumentManager keeps a process-wide cache keyed by file path, so the entry this test
            // created has to go before the next test configures the same fixture file.
            manager.documentClosed()
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun testTheTestItselfRunsOnTheDispatchThread() {
        assertTrue(
            ApplicationManager.getApplication().isDispatchThread,
            "these tests only prove anything while they run on the EDT",
        )
    }

    fun testDocumentOpenedDoesNotBlockTheDispatchThread() {
        service.stallSends()

        val elapsed = measureTimeMillis { manager.documentOpened() }

        assertTrue(
            elapsed < TimeUnit.SECONDS.toMillis(STALLED_SEND_TIMEOUT_SECONDS) / 2,
            "documentOpened held the dispatch thread for ${elapsed}ms while the send was stalled",
        )
        assertTrue(service.awaitStalledSend(), "the didOpen notification was never attempted")
    }

    fun testDocumentChangedDoesNotBlockTheDispatchThread() {
        manager.documentOpened()
        assertNotNull(
            service.opened.poll(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
            "didOpen was never sent",
        )
        service.stallSends()

        val elapsed = measureTimeMillis {
            WriteCommandAction.runWriteCommandAction(project) {
                editor.document.insertString(1, "\"name\": \"demo\"")
            }
        }

        assertTrue(
            elapsed < TimeUnit.SECONDS.toMillis(STALLED_SEND_TIMEOUT_SECONDS) / 2,
            "typing held the dispatch thread for ${elapsed}ms while the send was stalled",
        )
        assertTrue(service.awaitStalledSend(), "the didChange notification was never attempted")
    }

    fun testDocumentClosedDoesNotBlockTheDispatchThread() {
        manager.documentOpened()
        assertNotNull(
            service.opened.poll(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
            "didOpen was never sent",
        )
        service.stallSends()

        val elapsed = measureTimeMillis { manager.documentClosed() }

        assertTrue(
            elapsed < TimeUnit.SECONDS.toMillis(STALLED_SEND_TIMEOUT_SECONDS) / 2,
            "documentClosed held the dispatch thread for ${elapsed}ms while the send was stalled",
        )
        assertTrue(service.awaitStalledSend(), "the didClose notification was never attempted")
    }

    fun testDocumentOpenedSendsTheCurrentText() {
        manager.documentOpened()

        val params =
            assertNotNull(
                service.opened.poll(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
                "didOpen was never sent",
            )
        assertEquals("{}", params.textDocument.text)
        assertEquals(manager.identifier.uri, params.textDocument.uri)
    }

    fun testARequestDoesNotOvertakeAnEarlierChange() {
        manager.documentOpened()
        assertNotNull(
            service.opened.poll(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
            "didOpen was never sent",
        )
        // Hold every notification in the transport long enough that a request issued right after
        // one would reach the server first unless it travels on the same queue.
        service.slowDownNotifications(SLOW_NOTIFICATION_MS)
        WriteCommandAction.runWriteCommandAction(project) {
            editor.document.insertString(1, "\"name\": \"demo\"")
        }

        manager.completions(Position(0, 1))

        val order =
            (1..3).map {
                checkNotNull(service.sendOrder.poll(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                    "only ${it - 1} of 3 messages arrived"
                }
            }
        assertEquals(listOf("didOpen", "didChange", "completion"), order)
    }

    fun testNotificationsArriveInSubmissionOrder() {
        manager.documentOpened()
        WriteCommandAction.runWriteCommandAction(project) {
            editor.document.insertString(1, "\"name\": \"demo\"")
        }
        manager.documentClosed()

        val order =
            (1..3).map {
                checkNotNull(service.sendOrder.poll(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                    "only ${it - 1} of 3 notifications arrived"
                }
            }
        assertEquals(listOf("didOpen", "didChange", "didClose"), order)
    }
}
