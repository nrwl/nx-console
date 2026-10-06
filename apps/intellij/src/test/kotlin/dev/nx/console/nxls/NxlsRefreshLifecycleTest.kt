package dev.nx.console.nxls

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlin.test.assertEquals as assertEqual
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.runBlocking

class NxlsRefreshLifecycleTest : BasePlatformTestCase() {
    private lateinit var harness: PlatformLspTestHarness
    private val events = mutableListOf<String>()

    override fun setUp() {
        super.setUp()
        harness = PlatformLspTestHarness(project, myFixture.tempDirFixture.getFile(".")!!)
        project.messageBus.connect(testRootDisposable).apply {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_STARTED_TOPIC,
                NxWorkspaceRefreshStartedListener { events.add("started") },
            )
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener { events.add("completed") },
            )
        }
    }

    override fun tearDown() {
        try {
            harness.session.dispose()
        } finally {
            super.tearDown()
        }
    }

    fun testSuccessfulInitializationIsSeparateFromRealRefreshCompletion() {
        val ticket = harness.session.restartWithRefreshTicket()
        harness.runPendingTasks()
        harness.ready()
        assertEqual(listOf("started"), events)
        assertFalse(ticket.isCompleted)
        harness.ready()
        assertEqual(listOf("started"), events)
        harness.session.workspaceRefresh(harness.servers.last().descriptor.generation, false)
        assertTrue(ticket.isCompleted)
        assertEqual(listOf("started", "completed"), events)
    }

    fun testSyntheticStartedPrecedesBufferedServerRefreshEvents() {
        val ticket = harness.session.restartWithRefreshTicket()
        harness.runPendingTasks()
        val generation = harness.servers.last().descriptor.generation
        harness.session.workspaceRefresh(generation, true)
        harness.session.workspaceRefresh(generation, false)
        assertTrue(events.isEmpty())
        assertFalse(ticket.isCompleted)
        harness.ready()
        assertEqual(listOf("started", "started", "completed"), events)
        assertTrue(ticket.isCompleted)
    }

    fun testTicketInstalledBeforeStartCallbacksAndReplayedToLateWaiter() = runBlocking {
        harness.onStart = { server ->
            harness.session.workspaceRefresh(server.descriptor.generation, true)
            harness.session.workspaceRefresh(server.descriptor.generation, false)
            harness.ready(server)
        }
        val ticket = harness.session.restartWithRefreshTicket()
        harness.runPendingTasks()
        ticket.await()
        ticket.await()
        assertEqual(listOf("started", "started", "completed"), events)
    }

    fun testRetiredGenerationCannotCompleteReplacementTicket() {
        val oldTicket = harness.session.restartWithRefreshTicket()
        harness.runPendingTasks()
        val old = harness.servers.last()
        val newTicket = harness.session.restartWithRefreshTicket()
        harness.runPendingTasks()
        harness.ready()
        harness.session.workspaceRefresh(old.descriptor.generation, false)
        assertTrue(oldTicket.isCancelled)
        assertFalse(newTicket.isCompleted)
        assertEqual(listOf("started"), events)
    }

    fun testDeathCancelsTicketAndDiscardsBufferedEvents() {
        val ticket = harness.session.restartWithRefreshTicket()
        harness.runPendingTasks()
        val old = harness.servers.last()
        harness.session.workspaceRefresh(old.descriptor.generation, false)
        harness.die()
        harness.ready(old)
        assertTrue(ticket.isCancelled)
        assertTrue(events.isEmpty())
    }

    fun testUntrustedRestartKeepsTicketUntilTrustAndRealRefresh() = runBlocking {
        harness.trusted = false
        val ticket = harness.session.restartWithRefreshTicket()
        harness.runPendingTasks()
        assertTrue(harness.servers.isEmpty())
        assertFalse(ticket.isCompleted)
        harness.trusted = true
        harness.trustCallback!!(project)
        harness.runPendingTasks()
        harness.ready()
        assertFalse(ticket.isCompleted)
        harness.session.workspaceRefresh(harness.servers.last().descriptor.generation, false)
        ticket.await()
    }
}
