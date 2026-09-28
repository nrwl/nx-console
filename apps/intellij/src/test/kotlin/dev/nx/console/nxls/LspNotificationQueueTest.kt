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

class LspNotificationQueueTest : BasePlatformTestCase() {

    private lateinit var scope: CoroutineScope
    private lateinit var queue: LspNotificationQueue

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        queue = LspNotificationQueue(scope)
    }

    override fun tearDown() {
        try {
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun testNotificationsRunOffTheSubmittingThread() {
        val submittingThread = Thread.currentThread()
        val handoff = SynchronousQueue<Thread>()

        queue.submit { handoff.put(Thread.currentThread()) }

        val consumingThread =
            assertNotNull(
                handoff.poll(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
                "the notification was never sent",
            )
        assertNotSame(submittingThread, consumingThread)
    }

    fun testSubmitDoesNotBlockWhileAnEarlierNotificationIsStuck() {
        val stuck = CountDownLatch(1)
        val reachedStuckNotification = CountDownLatch(1)
        queue.submit {
            reachedStuckNotification.countDown()
            stuck.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        }
        assertTrue(
            reachedStuckNotification.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
            "the queue never picked up the first notification",
        )

        val elapsed = measureTimeMillis { queue.submit {} }

        assertTrue(elapsed < 1000, "submitting blocked the caller for ${elapsed}ms")
        stuck.countDown()
    }

    fun testNotificationsKeepSubmissionOrder() {
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
            "only ${sent.size} of 50 notifications were sent",
        )
        assertEquals((0 until 50).toList(), sent.toList())
    }

    fun testCancellingTheScopeStopsTheQueueAcceptingNotifications() {
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
            "a notification was still sent after the scope was cancelled",
        )
    }

    fun testAFailingNotificationDoesNotStopTheQueue() {
        val sentAfterTheFailure = CountDownLatch(1)

        queue.submit { throw IllegalStateException("broken pipe") }
        queue.submit { sentAfterTheFailure.countDown() }

        assertTrue(
            sentAfterTheFailure.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
            "the queue stopped after a notification threw",
        )
    }
}
