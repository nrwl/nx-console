package dev.nx.console.nxls

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.util.SystemInfo
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.nxls.client.NxlsLanguageClient
import dev.nx.console.nxls.managers.DocumentManager
import java.nio.file.Path
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.system.measureTimeMillis
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import org.eclipse.lsp4j.DidOpenTextDocumentParams
import org.eclipse.lsp4j.TextDocumentItem
import org.eclipse.lsp4j.jsonrpc.MessageConsumer
import org.eclipse.lsp4j.services.TextDocumentService

/** Comfortably larger than any platform's pipe buffer plus the JDK's own output buffering. */
private const val DOCUMENT_BYTES = 256 * 1024

private const val AWAIT_TIMEOUT_SECONDS = 30L

/** A send that is still running after this long is parked rather than merely slow. */
private const val BLOCKED_WRITE_PROOF_MS = 3_000L

private const val MAX_DISPATCH_THREAD_MS = 2_000L

/**
 * How long the stand-in server refuses to read. Longer than every wait below, so the transport
 * stays blocked for the whole of a passing run.
 */
private const val SERVER_STALL_MS = 60_000L

/**
 * Stands in for an nxls that has not started reading yet.
 *
 * It holds its stdin open and consumes nothing for the number of milliseconds given as its first
 * argument, which is the state a real language server is in while Node boots or while it recomputes
 * the project graph.
 *
 * It then starts draining. That matters only when something regresses: a caller frozen inside the
 * write is released and its test fails with a readable message, instead of wedging the whole suite
 * until the build times out.
 */
object StdinIgnoringServer {
    @JvmStatic
    fun main(args: Array<String>) {
        Thread.sleep(args.first().toLong())
        val discarded = ByteArray(8192)
        @Suppress("ControlFlowWithEmptyBody") while (System.`in`.read(discarded) >= 0) {}
    }
}

/**
 * Reproduces the freeze JetBrains reported against the real transport rather than a stand-in.
 *
 * There is a real child process that never drains its stdin, a real lsp4j launcher serializing and
 * writing into that process' pipe, and the real [DocumentManager] sending from the dispatch thread.
 * The first test establishes the premise the other freeze tests assume, that such a write genuinely
 * parks its caller, and the second shows the dispatch thread no longer is that caller.
 */
class NxlsTransportFreezeTest : BasePlatformTestCase() {

    private lateinit var process: Process
    private lateinit var executor: ExecutorService
    private lateinit var scope: CoroutineScope
    private lateinit var queue: LspMessageQueue
    private lateinit var textService: TextDocumentService
    private lateinit var manager: DocumentManager

    override fun setUp() {
        super.setUp()
        process = startStdinIgnoringServer()
        executor = Executors.newCachedThreadPool()
        scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        queue = LspMessageQueue(scope)
        // The launcher production builds, so removing the queueing from createNxlsLauncher or
        // from its use here is caught by this test rather than passing quietly.
        val launcher =
            createNxlsLauncher(
                NxlsLanguageClient(),
                process.inputStream,
                process.outputStream,
                executor,
                queue,
            )
        textService = launcher.remoteProxy.textDocumentService

        myFixture.configureByText("workspace.json", largeDocument())
        manager = DocumentManager.getInstance(myFixture.editor)
        manager.addTextDocumentService(textService)
    }

    override fun tearDown() {
        try {
            manager.documentClosed()
            // Killing the server breaks the pipe, which releases anything parked in a write.
            process.destroyForcibly()
            process.waitFor(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            scope.cancel()
            executor.shutdownNow()
        } finally {
            super.tearDown()
        }
    }

    fun testQueueingSurvivesAWrappedConsumer() {
        // Production passes a decorator for logging, so by the time lsp4j has applied it the
        // outbound consumer is no longer a StreamMessageConsumer. Reading the direction from the
        // decorated consumer instead of the original would stop queueing here and only here.
        val decorated =
            createNxlsLauncher(
                    NxlsLanguageClient(),
                    process.inputStream,
                    process.outputStream,
                    executor,
                    queue,
                ) { consume ->
                    MessageConsumer { message -> consume.consume(message) }
                }
                .remoteProxy
                .textDocumentService

        val elapsed = measureTimeMillis { decorated.didOpen(params()) }

        assertTrue(
            elapsed < MAX_DISPATCH_THREAD_MS,
            "a decorated consumer sent on the caller's thread and held it for ${elapsed}ms",
        )
        assertNotNull(
            waitForBlockedPipeWrite(),
            "the decorated send never reached the server's pipe",
        )
    }

    fun testAStalledServerReallyParksAPipeWrite() {
        val sender = Thread { runCatching { textService.didOpen(params()) } }
        sender.isDaemon = true

        sender.start()
        sender.join(BLOCKED_WRITE_PROOF_MS)

        // The premise every freeze test rests on: this setup genuinely fills the server's pipe
        // and leaves a thread stopped in the same frame JetBrains' report shows.
        val blocked =
            waitForBlockedPipeWrite()
                ?: error(
                    "no thread is parked in a pipe write, so nothing here stalls the transport"
                )
        // And the caller is not that thread, because the send was handed to the queue.
        assertNotSame(sender, blocked)
        assertFalse(sender.isAlive, "the sending thread is still stuck in the transport")
    }

    fun testDocumentOpenedLeavesTheBlockingWriteOffTheDispatchThread() {
        assertTrue(
            ApplicationManager.getApplication().isDispatchThread,
            "this test only means anything while it runs on the EDT",
        )

        val elapsed = measureTimeMillis { manager.documentOpened() }

        assertTrue(
            elapsed < MAX_DISPATCH_THREAD_MS,
            "documentOpened held the dispatch thread for ${elapsed}ms against a stalled server",
        )
        val blocked =
            waitForBlockedPipeWrite()
                ?: error("the didOpen never reached the language server's pipe")
        assertNotSame(Thread.currentThread(), blocked)
    }

    private fun startStdinIgnoringServer(): Process {
        val java =
            Path.of(
                System.getProperty("java.home"),
                "bin",
                if (SystemInfo.isWindows) "java.exe" else "java",
            )
        return ProcessBuilder(
                java.toString(),
                "-cp",
                System.getProperty("java.class.path"),
                StdinIgnoringServer::class.java.name,
                SERVER_STALL_MS.toString(),
            )
            .start()
    }

    private fun waitForBlockedPipeWrite(): Thread? {
        val deadline = System.currentTimeMillis() + TimeUnit.SECONDS.toMillis(AWAIT_TIMEOUT_SECONDS)
        while (System.currentTimeMillis() < deadline) {
            blockedInAPipeWrite()?.let {
                return it
            }
            Thread.sleep(50)
        }
        return null
    }

    /**
     * Finds a thread parked in the exact frame JetBrains' freeze report shows on the EDT,
     * `java.io.FileOutputStream` writing into the language server's stdin.
     */
    private fun blockedInAPipeWrite(): Thread? =
        Thread.getAllStackTraces()
            .entries
            .firstOrNull { (_, stack) ->
                stack.any { it.className == "java.io.FileOutputStream" } &&
                    stack.any { it.className.startsWith("org.eclipse.lsp4j") }
            }
            ?.key

    private fun params() =
        DidOpenTextDocumentParams(
            TextDocumentItem(manager.identifier.uri, "json", 1, largeDocument())
        )

    private fun largeDocument() = "{\"filler\":\"" + "x".repeat(DOCUMENT_BYTES) + "\"}"
}
