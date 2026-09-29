package dev.nx.console.nxls

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.models.NxDownloadAndExtractArtifactRequest
import dev.nx.console.nxls.server.NxlsLanguageServer
import dev.nx.console.nxls.server.requests.NxCreateProjectGraphRequest
import java.util.concurrent.CompletableFuture
import kotlin.test.assertEquals as assertEqual
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
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
        advanceTimeBy(9_900)
        harness.ready().response.complete("22.0.0")
        assertEqual("22.0.0", result.await())
        assertEqual(9_900, testScheduler.currentTime)
    }

    fun testNeverStartsExpiresAtOriginalDeadline() = runTest {
        val result = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
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
        val old = harness.servers.single()
        advanceTimeBy(5_000)
        harness.session.restart()
        harness.ready(old)
        runCurrent()
        assertFalse(result.isCompleted)
        harness.ready().response.complete("new")
        assertEqual("new", result.await())
        assertEqual(0, old.sends)
    }

    fun testOneWaiterTimesOutWhileAnotherSucceeds() = runTest {
        val first = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
        advanceTimeBy(5_000)
        val second = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
        advanceTimeBy(5_000)
        assertNull(first.await())
        harness.ready().response.complete("ready")
        assertEqual("ready", second.await())
    }

    fun testCancellingWaiterDoesNotCancelSharedReadiness() = runTest {
        val first = async { adapter().request { it.workspaceSerialized() } }
        val second = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
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
        assertFalse(result.isCompleted)
        advanceTimeBy(9_900)
        harness.die(old)
        harness.session.start()
        harness.ready().response.complete("restarted")
        assertEqual("restarted", result.await())
        assertEqual(1, old.sends)
        assertEqual(0, old.effects)
    }

    fun testDeclinedDispatchDoesNotRenewDeadline() = runTest {
        val result = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
        advanceTimeBy(9_900)
        harness.ready().decline = true
        runCurrent()
        advanceTimeBy(100)
        assertNull(result.await())
        assertEqual(10_000, testScheduler.currentTime)
        assertEqual(1, harness.servers.single().sends)
    }

    fun testRequestMayOutliveStartupDeadline() = runTest {
        val server = harness.ready(harness.start())
        val result = async { adapter().request { it.workspaceSerialized() } }
        runCurrent()
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
        harness.die(server)
        runCurrent()
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
        assertEqual(1, server.effects)
        harness.die(server)
        harness.session.start()
        harness.ready().response.complete(null)
        runCurrent()
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
            assertEqual(1, server.effects)
            harness.die(server)
            runCurrent()
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
        harness.session.stop()
        assertNull(result.await())
        assertEqual(1, server.effects)
        assertEqual(1, harness.descriptors.size)
    }

    fun testUntrustedRequestExpiresWithoutStarting() = runTest {
        harness.trusted = false
        assertNull(adapter().request { it.workspaceSerialized() })
        assertEqual(10_000, testScheduler.currentTime)
        assertTrue(harness.descriptors.isEmpty())
    }
}
