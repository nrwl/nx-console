package dev.nx.console.nxls

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlin.test.assertEquals as assertEqual
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest

@OptIn(ExperimentalCoroutinesApi::class)
class NxlsServiceLifecycleTest : BasePlatformTestCase() {
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

    fun testAwaitStartedIsUnboundedCancellableAndReplayable() = runTest {
        val service =
            NxlsService(project, backgroundScope).apply { sessionOverride = harness.session }
        val cancelled = async { service.awaitStarted() }
        val waiting = async { service.awaitStarted() }
        runCurrent()
        advanceTimeBy(60_000)
        assertFalse(waiting.isCompleted)
        cancelled.cancel()
        assertFalse(service.isStarted())
        harness.ready(harness.start())
        waiting.await()
        service.awaitStarted()
        assertTrue(service.isStarted())
        assertTrue(cancelled.isCancelled)
    }

    fun testRunAfterStartedIsOneShotAcrossRestart() = runTest {
        val service =
            NxlsService(project, backgroundScope).apply { sessionOverride = harness.session }
        var calls = 0
        service.runAfterStarted { calls++ }
        runCurrent()
        assertEqual(0, calls)
        harness.ready(harness.start())
        runCurrent()
        assertEqual(1, calls)
        harness.session.restart()
        harness.ready()
        runCurrent()
        assertEqual(1, calls)
    }

    fun testAllFourConsumersInitializeOnceWhenProviderStartsFirst() = runTest {
        val service =
            NxlsService(project, backgroundScope).apply { sessionOverride = harness.session }
        val consumers = IntArray(4)
        harness.ready(harness.start())
        repeat(3) {
            service.initializeConsumersOnce { consumers.indices.forEach { consumers[it]++ } }
        }
        service.start()
        runCurrent()
        assertEqual(listOf(1, 1, 1, 1), consumers.toList())
        harness.session.restart()
        harness.ready()
        runCurrent()
        assertEqual(listOf(1, 1, 1, 1), consumers.toList())
        assertEqual(2, harness.descriptors.size)
    }

    fun testConsumersWaitForRealInitialization() = runTest {
        val service =
            NxlsService(project, backgroundScope).apply { sessionOverride = harness.session }
        var calls = 0
        service.initializeConsumersOnce { calls++ }
        val starting = async { service.start() }
        runCurrent()
        assertFalse(starting.isCompleted)
        assertEqual(0, calls)
        harness.ready()
        starting.await()
        runCurrent()
        assertEqual(1, calls)
    }

    fun testCloseIsIdempotentAndClearsRegistration() = runTest {
        val service =
            NxlsService(project, backgroundScope).apply { sessionOverride = harness.session }
        myFixture.configureByText("nx.json", "{}")
        service.addDocument(myFixture.editor)
        harness.ready(harness.start())
        service.close()
        service.close()
        harness.runPendingTasks()
        assertFalse(service.isStarted())
        assertFalse(service.isEditorConnected(myFixture.editor))
        assertEqual(1, harness.stops)
    }

    fun testRestartWaitsForReplacementAndKeepsEditorBookkeeping() = runTest {
        val service =
            NxlsService(project, backgroundScope).apply { sessionOverride = harness.session }
        myFixture.configureByText("nx.json", "{}")
        service.addDocument(myFixture.editor)
        val old = harness.ready(harness.start())
        val restarting = async { service.restart() }
        runCurrent()
        assertFalse(restarting.isCompleted)
        assertFalse(service.isStarted())
        harness.ready(old)
        runCurrent()
        assertFalse(restarting.isCompleted)
        harness.ready()
        restarting.await()
        assertTrue(service.isStarted())
        assertTrue(service.isEditorConnected(myFixture.editor))
    }
}
