package dev.nx.console.nxls

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.models.NxDownloadAndExtractArtifactRequest
import dev.nx.console.nxls.server.NxlsLanguageServer
import dev.nx.console.nxls.server.requests.NxCreateProjectGraphRequest
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.system.measureTimeMillis
import kotlin.test.assertEquals as assertEqual
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest

@OptIn(ExperimentalCoroutinesApi::class)
class NxlsRequestAdapterTest : BasePlatformTestCase() {
    private lateinit var harness: PlatformLspTestHarness

    override fun setUp() {
        super.setUp()
        harness = PlatformLspTestHarness(project, myFixture.tempDirFixture.getFile(".")!!)
    }

    override fun tearDown() {
        try {
            harness.session.dispose()
        } finally {
            super.tearDown()
        }
    }

    private fun TestScope.adapter() =
        NxlsRequestAdapter(harness.session) { testScheduler.currentTime }

    fun testReadinessAtNinePointNineSeconds() = runTest {
        val result = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
        harness.runPendingTasks()
        advanceTimeBy(9_900)
        harness.ready().response.complete("22.0.0")
        assertEqual("22.0.0", result.await())
        assertEqual(9_900, testScheduler.currentTime)
    }

    fun testNeverStartsExpiresAtOriginalDeadline() = runTest {
        val result = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
        harness.runPendingTasks()
        advanceTimeBy(10_000)
        assertNull(result.await())
        assertEqual(10_000, testScheduler.currentTime)
        assertEqual(0, harness.servers.single().sends)
    }

    fun testLateSubscriberSeesReadiness() = runTest {
        harness.ready(harness.start()).response.complete("ready")
        assertEqual("ready", adapter().request { it.workspaceSerialized() })
    }

    fun testRestartWhileWaitingUsesNewGeneration() = runTest {
        val result = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
        harness.runPendingTasks()
        val old = harness.servers.single()
        advanceTimeBy(5_000)
        harness.session.restart()
        harness.runPendingTasks()
        harness.ready(old)
        runCurrent()
        harness.runPendingTasks()
        assertFalse(result.isCompleted)
        harness.ready().response.complete("new")
        assertEqual("new", result.await())
        assertEqual(0, old.sends)
    }

    fun testOneWaiterTimesOutWhileAnotherSucceeds() = runTest {
        val first = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
        harness.runPendingTasks()
        advanceTimeBy(5_000)
        val second = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
        harness.runPendingTasks()
        advanceTimeBy(5_000)
        assertNull(first.await())
        harness.ready().response.complete("ready")
        assertEqual("ready", second.await())
    }

    fun testCancellingWaiterDoesNotCancelSharedReadiness() = runTest {
        val first = async { adapter().request { it.workspaceSerialized() } }
        val second = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
        harness.runPendingTasks()
        first.cancel()
        harness.ready().response.complete("ready")
        assertEqual("ready", second.await())
    }

    fun testDispatchedJsonNullIsNotRetried() = runTest {
        val server = harness.ready(harness.start())
        server.response.complete(null)
        assertNull(adapter().request { it.workspaceSerialized() })
        assertEqual(1, server.sends)
        assertEqual(1, server.effects)
        assertEqual(0, testScheduler.currentTime)
    }

    fun testDeclinedDispatchReawaitsNewReadiness() = runTest {
        val old = harness.ready(harness.start()).apply { decline = true }
        val result = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
        harness.runPendingTasks()
        assertFalse(result.isCompleted)
        advanceTimeBy(9_900)
        harness.die(old)
        harness.session.start()
        harness.runPendingTasks()
        harness.ready().response.complete("restarted")
        assertEqual("restarted", result.await())
        assertEqual(1, old.sends)
        assertEqual(0, old.effects)
    }

    fun testDeclinedDispatchDoesNotRenewDeadline() = runTest {
        val result = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
        harness.runPendingTasks()
        advanceTimeBy(9_900)
        harness.ready().decline = true
        runCurrent()
        harness.runPendingTasks()
        advanceTimeBy(100)
        assertNull(result.await())
        assertEqual(10_000, testScheduler.currentTime)
        assertEqual(1, harness.servers.single().sends)
    }

    fun testRequestMayOutliveStartupDeadline() = runTest {
        val server = harness.ready(harness.start())
        val result = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
        harness.runPendingTasks()
        advanceTimeBy(60_000)
        assertFalse(result.isCompleted)
        server.response.complete("slow")
        assertEqual("slow", result.await())
        assertEqual(1, server.effects)
    }

    fun testDeathBeforeQueuedDispatchReleasesAbandonedFuture() = runTest {
        val server = harness.ready(harness.start()).apply { queued = true }
        val result = async { adapter().request { it.startDaemon() } }
        runCurrent()
        harness.runPendingTasks()
        harness.die(server)
        runCurrent()
        harness.runPendingTasks()
        assertTrue(result.isCompleted)
        assertNull(result.await())
        server.queuedSender!!()
        assertEqual(0, server.effects)
        assertEqual(1, server.sends)
    }

    fun testDeathAfterDispatchNeverRepeatsSideEffect() = runTest {
        val server = harness.ready(harness.start())
        val result = async { adapter().request { it.startDaemon() } }
        runCurrent()
        harness.runPendingTasks()
        assertEqual(1, server.effects)
        harness.die(server)
        harness.session.start()
        harness.runPendingTasks()
        harness.ready().response.complete(null)
        runCurrent()
        harness.runPendingTasks()
        assertTrue(result.isCompleted)
        assertNull(result.await())
        assertEqual(1, harness.servers.sumOf { it.effects })
        assertEqual(1, harness.servers.sumOf { it.sends })
    }

    fun testEverySideEffectingRpcRunsAtMostOnceAcrossDeath() = runTest {
        val requests =
            listOf<(NxlsLanguageServer) -> CompletableFuture<*>>(
                { it.createProjectGraph(NxCreateProjectGraphRequest(false)) },
                { it.startDaemon() },
                { it.stopDaemon() },
                {
                    it.downloadAndExtractArtifact(
                        NxDownloadAndExtractArtifactRequest("https://example.test/artifact")
                    )
                },
            )
        for (sender in requests) {
            val server = harness.ready(harness.start())
            val result = async { adapter().request { sender(it).thenApply { value -> value } } }
            runCurrent()
            harness.runPendingTasks()
            assertEqual(1, server.effects)
            harness.die(server)
            runCurrent()
            harness.runPendingTasks()
            assertTrue(result.isCompleted)
            assertNull(result.await())
            assertEqual(1, server.sends)
            assertEqual(1, server.effects)
        }
        assertEqual(4, harness.servers.sumOf { it.effects })
    }

    fun testRetirementInsideSenderPreventsSideEffect() = runTest {
        val server = harness.ready(harness.start())
        server.beforeInvoke = { harness.session.restart() }
        assertNull(adapter().request { it.startDaemon() })
        assertEqual(0, server.effects)
        assertEqual(1, server.sends)
    }

    fun testSynchronousThrowBecomesFailedFuture() = runTest {
        val server = harness.ready(harness.start())
        assertFailsWith<IllegalArgumentException> {
            adapter().request<String> { throw IllegalArgumentException("invalid request") }
        }
        assertFalse(server.senderEscaped)
        assertEqual(1, server.sends)
    }

    fun testFailedRpcIsNotRetried() = runTest {
        val server = harness.ready(harness.start())
        server.response.completeExceptionally(IllegalStateException("server rejected request"))
        assertFailsWith<IllegalStateException> { adapter().request { it.startDaemon() } }
        assertEqual(1, server.effects)
        assertEqual(1, server.sends)
    }

    fun testStopReleasesInflightRequest() = runTest {
        val server = harness.ready(harness.start())
        val result = async { adapter().request { it.startDaemon() } }
        runCurrent()
        harness.runPendingTasks()
        harness.session.stop()
        assertNull(result.await())
        assertEqual(1, server.effects)
        assertEqual(1, harness.descriptors.size)
    }

    fun testBlockedSenderDoesNotHoldTheSessionLockOnTheEdt() {
        harness.ready(harness.start())
        val entered = CountDownLatch(1)
        val release = CountDownLatch(1)
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        try {
            scope.launch {
                NxlsRequestAdapter(harness.session).request {
                    entered.countDown()
                    release.await(5, TimeUnit.SECONDS)
                    CompletableFuture.completedFuture(Unit)
                }
            }
            assertTrue(entered.await(5, TimeUnit.SECONDS))
            val elapsed = measureTimeMillis { harness.session.stop() }
            assertTrue(elapsed < 1000, "Session retirement blocked the EDT for ${elapsed}ms")
        } finally {
            release.countDown()
            scope.cancel()
        }
    }

    fun testUntrustedRequestExpiresWithoutStarting() = runTest {
        harness.trusted = false
        assertNull(adapter().request { it.workspaceSerialized() })
        assertEqual(10_000, testScheduler.currentTime)
        assertTrue(harness.descriptors.isEmpty())
    }
}
