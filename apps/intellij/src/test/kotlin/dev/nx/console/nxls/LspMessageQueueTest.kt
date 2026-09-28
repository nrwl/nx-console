package dev.nx.console.nxls

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.SynchronousQueue
import java.util.concurrent.TimeUnit
import kotlin.system.measureTimeMillis
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.job

private const val AWAIT_TIMEOUT_SECONDS = 30L

class LspMessageQueueTest : BasePlatformTestCase() {

    private lateinit var scope: CoroutineScope
    private lateinit var queue: LspMessageQueue

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        queue = LspMessageQueue(scope)
    }

    override fun tearDown() {
        try {
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun testMessagesRunOffTheSubmittingThread() {
        val submittingThread = Thread.currentThread()
        val handoff = SynchronousQueue<Thread>()

        queue.submit { handoff.put(Thread.currentThread()) }

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
        queue.submit {
            reachedStuckMessage.countDown()
            stuck.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        }
        assertTrue(
            reachedStuckMessage.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
            "the queue never picked up the first message",
        )

        val elapsed = measureTimeMillis { queue.submit {} }

        assertTrue(elapsed < 1000, "submitting blocked the caller for ${elapsed}ms")
        stuck.countDown()
    }

    fun testMessagesKeepSubmissionOrder() {
        val sent = CopyOnWriteArrayList<Int>()
        val allSent = CountDownLatch(50)

        repeat(50) { index ->
            queue.submit {
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

    fun testCancellingTheScopeStopsTheQueueAcceptingMessages() {
        val job = scope.coroutineContext.job
        scope.cancel()
        val deadline = System.currentTimeMillis() + TimeUnit.SECONDS.toMillis(10)
        while (!job.isCompleted && System.currentTimeMillis() < deadline) {
            Thread.sleep(50)
        }
        assertTrue(job.isCompleted, "the queue's scope never finished")

        val sent = CountDownLatch(1)
        queue.submit { sent.countDown() }

        assertFalse(
            sent.await(1, TimeUnit.SECONDS),
            "a message was still sent after the scope was cancelled",
        )
    }

    fun testAFailingMessageDoesNotStopTheQueue() {
        val sentAfterTheFailure = CountDownLatch(1)

        queue.submit { throw IllegalStateException("broken pipe") }
        queue.submit { sentAfterTheFailure.countDown() }

        assertTrue(
            sentAfterTheFailure.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
            "the queue stopped after a message threw",
        )
    }
}
