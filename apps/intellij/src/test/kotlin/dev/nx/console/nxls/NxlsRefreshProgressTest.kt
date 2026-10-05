package dev.nx.console.nxls

import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class NxlsRefreshProgressTest {
    @Test
    fun refreshPreservesOrderAndAwaitsRealCompletionBeforePolling() = runTest {
        val events = mutableListOf<String>()
        val progress = mutableListOf<Double>()
        val refreshed = CompletableDeferred<Unit>()
        val result = async {
            refreshNxWorkspace(
                {
                    events.add("stop")
                    throw IllegalStateException("daemon unavailable")
                },
                {
                    events.add("restart")
                    refreshed
                },
                { events.add("initialized") },
                { events.add("graph") },
                { events.add("poll") },
                { progress.add(it) },
            )
        }
        runCurrent()
        assertFalse(result.isCompleted)
        assertEquals(listOf("stop", "restart", "initialized", "graph"), events)
        assertEquals(listOf(0.1, 0.3, 0.5, 0.7), progress)
        refreshed.complete(Unit)
        result.await()
        assertEquals(listOf("stop", "restart", "initialized", "graph", "poll"), events)
        assertEquals(listOf(0.1, 0.3, 0.5, 0.7, 0.9, 1.0), progress)
    }

    @Test
    fun initializationCannotCompleteRefreshProgressAndWaitIsFinite() = runTest {
        var polled = false
        assertFailsWith<TimeoutCancellationException> {
            refreshNxWorkspace({}, { CompletableDeferred() }, {}, {}, { polled = true }, {})
        }
        assertEquals(120_000, testScheduler.currentTime)
        assertFalse(polled)
    }

    @Test
    fun overallDeadlineIncludesDaemonRpcButAddsNoTenSecondRpcTimeout() = runTest {
        var restarted = false
        val result = async {
            refreshNxWorkspace(
                { delay(60_000) },
                {
                    restarted = true
                    CompletableDeferred(Unit)
                },
                {},
                {},
                {},
                {},
            )
        }
        advanceTimeBy(10_001)
        assertFalse(restarted)
        assertFalse(result.isCompleted)
        result.await()
        assertTrue(restarted)
        assertEquals(60_000, testScheduler.currentTime)
    }

    @Test
    fun timedOutDaemonCannotRestartEvenIfServiceTranslatesCancellation() = runTest {
        var restarted = false
        assertFailsWith<TimeoutCancellationException> {
            refreshNxWorkspace(
                {
                    try {
                        delay(200_000)
                    } catch (_: TimeoutCancellationException) {}
                },
                {
                    restarted = true
                    CompletableDeferred(Unit)
                },
                {},
                {},
                {},
                {},
            )
        }
        assertFalse(restarted)
        assertEquals(120_000, testScheduler.currentTime)
    }
}
