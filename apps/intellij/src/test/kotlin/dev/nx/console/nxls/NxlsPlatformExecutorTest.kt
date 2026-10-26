package dev.nx.console.nxls

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.nxls.server.NxlsLanguageServer
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.SynchronousQueue
import java.util.concurrent.TimeUnit
import kotlin.system.measureTimeMillis
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue
import kotlinx.coroutines.runBlocking
import org.eclipse.lsp4j.jsonrpc.Endpoint
import org.eclipse.lsp4j.jsonrpc.services.ServiceEndpoints

private const val AWAIT_TIMEOUT_SECONDS = 30L

class NxlsPlatformExecutorTest : BasePlatformTestCase() {

    private lateinit var harness: SdkLspTestHarness

    override fun setUp() {
        super.setUp()
        val remote =
            ServiceEndpoints.toServiceObject(
                object : Endpoint {
                    override fun request(method: String, parameter: Any?) =
                        CompletableFuture.completedFuture<Any?>(null)

                    override fun notify(method: String, parameter: Any?) = Unit
                },
                NxlsLanguageServer::class.java,
            )
        harness = SdkLspTestHarness(project, myFixture.tempDirFixture.getFile(".")!!, remote)
    }

    override fun tearDown() {
        try {
            harness.close()
        } finally {
            super.tearDown()
        }
    }

    fun testMessagesRunOffTheSubmittingThread() {
        val submittingThread = Thread.currentThread()
        val handoff = SynchronousQueue<Thread>()

        harness.server.sendNotification { handoff.put(Thread.currentThread()) }

        val consumingThread =
            assertNotNull(
                handoff.poll(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
                "the message was never sent",
            )
        assertNotSame(submittingThread, consumingThread)
    }

    fun testSubmitDoesNotBlockWhileAnEarlierMessageIsStuck() {
        val stuck = CountDownLatch(1)
        val reachedStuckMessage = CountDownLatch(1)
        harness.server.sendNotification {
            reachedStuckMessage.countDown()
            stuck.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        }
        assertTrue(
            reachedStuckMessage.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
            "the queue never picked up the first message",
        )

        val elapsed = measureTimeMillis { harness.server.sendNotification {} }

        assertTrue(elapsed < 1000, "submitting blocked the caller for ${elapsed}ms")
        stuck.countDown()
    }

    fun testMessagesKeepSubmissionOrder() {
        val sent = CopyOnWriteArrayList<Int>()
        val allSent = CountDownLatch(50)

        repeat(50) { index ->
            harness.server.sendNotification {
                sent.add(index)
                allSent.countDown()
            }
        }

        assertTrue(
            allSent.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
            "only ${sent.size} of 50 messages were sent",
        )
        assertEquals((0 until 50).toList(), sent.toList())
    }

    fun testStoppingTheServerStopsAcceptingMessages() {
        harness.stop()

        val sent = CountDownLatch(1)
        harness.server.sendNotification { sent.countDown() }

        assertFalse(
            sent.await(1, TimeUnit.SECONDS),
            "a message was still sent after the server stopped",
        )
    }

    fun testAFailingMessageDoesNotStopTheQueue() {
        val sentAfterTheFailure = CountDownLatch(1)

        runBlocking {
            assertFailsWith<IllegalStateException> {
                harness.server.sendRequest {
                    CompletableFuture.failedFuture<Unit>(IllegalStateException("broken pipe"))
                }
            }
        }
        harness.server.sendNotification { sentAfterTheFailure.countDown() }

        assertTrue(
            sentAfterTheFailure.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
            "the queue stopped after a message threw",
        )
    }
}
