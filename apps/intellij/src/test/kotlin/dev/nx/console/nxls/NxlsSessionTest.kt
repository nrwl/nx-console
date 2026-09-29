package dev.nx.console.nxls

import com.intellij.ide.trustedProjects.TrustedProjectsListener
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.util.Disposer
import com.intellij.platform.lsp.api.LspServerState
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlin.test.assertEquals as assertEqual
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue

class NxlsSessionTest : BasePlatformTestCase() {
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

    fun testPlatformCanConstructInactiveProjectService() {
        val session = NxlsSession.getInstance(project)
        assertSame(session, NxlsSession.getInstance(project))
        assertNull(session.ready.value)
    }

    fun testInitializationRequiresMatchingRunningServer() {
        val server = harness.start()
        val listener = server.descriptor.lspServerListener
        listener.serverInitialized(server.initializeResult)
        assertNull(harness.session.ready.value)
        server.state = LspServerState.Running
        harness.servers.clear()
        listener.serverInitialized(server.initializeResult)
        assertNull(harness.session.ready.value)
        harness.servers.add(server)
        listener.serverInitialized(server.initializeResult)
        assertSame(server, checkNotNull(harness.session.ready.value).server)
    }

    fun testLateCallbacksCannotRetireOrReadyReplacement() {
        val old = harness.ready(harness.start())
        val ended = checkNotNull(harness.session.ready.value).ended
        harness.session.restart()
        assertTrue(ended.isCompleted)
        old.descriptor.lspServerListener.serverInitialized(old.initializeResult)
        old.descriptor.lspServerListener.serverStopped(false)
        assertNull(harness.session.ready.value)
        val new = harness.ready()
        assertSame(new, checkNotNull(harness.session.ready.value).server)
        assertTrue(new.descriptor.generation > old.descriptor.generation)
        assertEqual(2, harness.descriptors.size)
    }

    fun testTrustTransitionStartsExactlyOnceWithoutAnotherRequest() {
        harness.trusted = false
        repeat(3) { harness.session.start() }
        assertTrue(harness.descriptors.isEmpty())
        harness.trusted = true
        harness.trustCallback!!(project)
        repeat(3) { harness.session.start() }
        assertEqual(1, harness.descriptors.size)
    }

    fun testPlatformTrustListenerStartsWaitingSession() {
        harness.trusted = false
        val session =
            NxlsSession(project, harness.manager, { harness.root }, { harness.trusted }) {
                disposable,
                callback ->
                TrustedProjectsListener.onceWhenProjectTrusted(disposable, callback)
            }
        Disposer.register(testRootDisposable, session)
        session.start()
        assertTrue(harness.descriptors.isEmpty())
        harness.trusted = true
        ApplicationManager.getApplication()
            .messageBus
            .syncPublisher(TrustedProjectsListener.TOPIC)
            .onProjectTrusted(project)
        session.start()
        assertEqual(1, harness.descriptors.size)
    }

    fun testTrustDoesNotUndoExplicitStop() {
        harness.trusted = false
        harness.session.start()
        harness.session.stop()
        harness.trusted = true
        harness.trustCallback!!(project)
        assertTrue(harness.descriptors.isEmpty())
    }

    fun testWorkspaceChangeCreatesNewPinnedDescriptor() {
        val old = harness.ready(harness.start())
        val ended = checkNotNull(harness.session.ready.value).ended
        val nested = myFixture.tempDirFixture.findOrCreateDir("nested")
        harness.session.changeWorkspace(nested)
        val new = harness.servers.last()
        assertSame(harness.root, old.descriptor.roots.single())
        assertSame(nested, new.descriptor.roots.single())
        assertTrue(ended.isCompleted)
        assertTrue(new.descriptor.generation > old.descriptor.generation)
        assertEqual(1, harness.stops)
    }

    fun testDisposeReleasesWaitersAndIgnoresTrustAndCallbacks() {
        val server = harness.ready(harness.start())
        val ended = checkNotNull(harness.session.ready.value).ended
        harness.session.dispose()
        assertTrue(ended.isCompleted)
        harness.trustCallback!!(project)
        harness.ready(server)
        harness.die(server)
        assertNull(harness.session.ready.value)
        assertEqual(1, harness.descriptors.size)
    }

    fun testUnexpectedStopRetiresWithoutARespawnLoop() {
        val server = harness.ready(harness.start())
        val ended = checkNotNull(harness.session.ready.value).ended
        harness.die(server)
        assertTrue(ended.isCompleted)
        assertNull(harness.session.ready.value)
        assertEqual(1, harness.descriptors.size)
        harness.session.start()
        assertEqual(2, harness.descriptors.size)
    }

    fun testDeclineDoesNotClearNewerReadiness() {
        val old = harness.ready(harness.start())
        val oldReady = checkNotNull(harness.session.ready.value)
        harness.die(old)
        harness.session.start()
        val new = harness.ready()
        harness.session.dispatchDeclined(oldReady)
        assertSame(new, checkNotNull(harness.session.ready.value).server)
    }
}
