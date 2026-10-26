package dev.nx.console.nxls

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.actionSystem.ex.ActionUtil
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.platform.lang.lsWidget.LanguageServicePopupSection
import com.intellij.platform.lsp.api.LspClient
import com.intellij.platform.lsp.api.LspClientDescriptor
import com.intellij.platform.lsp.api.LspClientManager
import com.intellij.platform.lsp.api.LspIntegrationProvider
import com.intellij.platform.lsp.api.lsWidget.LspWidgetInternalService
import com.intellij.testFramework.LightVirtualFile
import com.intellij.testFramework.TestActionEvent
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.testFramework.replaceService
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.test.assertEquals as assertEqual
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotSame
import kotlin.test.assertSame
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest

@OptIn(ExperimentalCoroutinesApi::class)
class NxlsLifecycleRegressionTest : BasePlatformTestCase() {
    private lateinit var harness: PlatformLspTestHarness

    override fun setUp() {
        super.setUp()
        harness = PlatformLspTestHarness(project, myFixture.tempDirFixture.getFile(".")!!)
        project.replaceService(NxlsSession::class.java, harness.session, testRootDisposable)
    }

    override fun tearDown() {
        try {
            harness.session.dispose()
        } finally {
            super.tearDown()
        }
    }

    fun testWidgetRestartBeforeShutdownCallbackUsesFreshGeneration() {
        checkWidgetRestart(initialized = true)
    }

    fun testWidgetRestartDuringInitializationUsesFreshGeneration() {
        checkWidgetRestart(initialized = false)
    }

    fun testWidgetRestartBeforeFirstLaunchIgnoresDelayedStop() = runTest {
        val file = myFixture.addFileToProject("nx.json", "{}").virtualFile
        project.replaceService(LspClientManager::class.java, harness.manager, testRootDisposable)
        ApplicationManager.getApplication()
            .replaceService(
                LspWidgetInternalService::class.java,
                object : LspWidgetInternalService() {
                    override fun createShowErrorOutputAction(lspClient: LspClient): AnAction? = null

                    override fun restartLspClient(lspClient: LspClient) {
                        // The SDK removes the server before rediscovery and asynchronous shutdown.
                        harness.manager.stopClients(lspClient.providerClass)
                    }

                    override fun stopLspClient(lspClient: LspClient) {
                        harness.manager.stopClients(lspClient.providerClass)
                    }
                },
                testRootDisposable,
            )
        val service =
            NxlsService(project, backgroundScope).apply { sessionOverride = harness.session }
        var refreshes = 0
        project.messageBus
            .connect(testRootDisposable)
            .subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener { refreshes++ },
            )

        harness.session.start()
        harness.runLifecycleTasks()
        val old = checkNotNull(harness.runNextStart())
        assertEqual(listOf(old), harness.registeredServers.toList())
        assertEqual(listOf(old), harness.pendingLaunches.toList())
        assertTrue(harness.lifecycleTasks.isEmpty())
        assertTrue(harness.launchedDescriptors.isEmpty())
        harness.delayStopCallbacks = true

        val provider = NxlsIntegrationProvider()
        val widget = checkNotNull(provider.createWidgetItem(old, file))
        assertEqual(LanguageServicePopupSection.ForCurrentFile, widget.widgetActionLocation)
        val widgetAction = widget.createWidgetAction()
        val restart =
            (widgetAction.templatePresentation.getClientProperty(ActionUtil.INLINE_ACTIONS)
                    ?: (widgetAction as DefaultActionGroup).getChildren(null).toList())
                .single()
        restart.actionPerformed(TestActionEvent.createTestEvent(restart))
        harness.runLifecycleTasks()
        assertTrue(harness.registeredServers.isEmpty())
        assertEqual(1, harness.pendingStops.size)

        val discovered = mutableListOf<LspClientDescriptor>()
        provider.fileOpened(project, file, starter(discovered))
        harness.manager.ensureClientStarted(
            NxlsIntegrationProvider::class.java,
            discovered.single(),
        )
        val replacement = checkNotNull(harness.runNextStart())
        assertEqual(listOf(old, replacement), harness.pendingLaunches.toList())
        harness.runNextLaunch()
        harness.runNextLaunch()
        harness.ready(replacement)
        assertTrue(service.isStarted())
        harness.deliverStopCallbacks()

        assertTrue(
            service.isStarted(),
            "Delayed stop from the first launch retired the replacement generation",
        )
        assertSame(replacement, harness.session.ready.value?.client)
        assertFalse(checkNotNull(harness.session.ready.value).ended.isCompleted)
        assertTrue(replacement.descriptor.generation > old.descriptor.generation)
        assertEqual(listOf(replacement.descriptor), harness.launchedDescriptors.toList())
        harness.session.workspaceRefresh(old.descriptor.generation, false)
        assertEqual(0, refreshes)
        harness.session.workspaceRefresh(replacement.descriptor.generation, false)
        assertEqual(1, refreshes)
        val waiting = backgroundScope.async { service.awaitStarted() }
        runCurrent()
        assertTrue(waiting.isCompleted, "awaitStarted did not observe the replacement generation")
        waiting.await()
        harness.runPendingTasks()
        assertEqual(listOf(replacement), harness.registeredServers.toList())
        assertEqual(2, harness.servers.size)
    }

    private fun checkWidgetRestart(initialized: Boolean) {
        val old = harness.start()
        if (initialized) harness.ready(old)
        val ended = harness.session.ready.value?.ended
        harness.delayStopCallbacks = true
        harness.manager.stopClients(NxlsIntegrationProvider::class.java)
        assertEqual(1, harness.pendingStops.size)
        val discovered = mutableListOf<LspClientDescriptor>()
        NxlsIntegrationProvider()
            .fileOpened(project, LightVirtualFile("nx.json"), starter(discovered))
        val descriptor = discovered.single() as NxlsClientDescriptor
        assertTrue(descriptor.generation > old.descriptor.generation)
        if (initialized) assertTrue(checkNotNull(ended).isCompleted)
        harness.manager.ensureClientStarted(NxlsIntegrationProvider::class.java, descriptor)
        val replacement = harness.ready()
        harness.deliverStopCallbacks()
        assertSame(replacement, harness.session.ready.value?.client)
        assertFalse(checkNotNull(harness.session.ready.value).ended.isCompleted)
        assertEqual(listOf(replacement), harness.registeredServers.toList())
        assertEqual(2, harness.servers.size)
    }

    fun testCancelledDiscoveryCanBeRetried() {
        val provider = NxlsIntegrationProvider()
        val discarded = mutableListOf<LspClientDescriptor>()
        assertFailsWith<ProcessCanceledException> {
            provider.fileOpened(project, LightVirtualFile("nx.json"), starter(discarded))
            // The platform discards the whole discovery batch on read-action cancellation.
            throw ProcessCanceledException()
        }
        assertEqual(1, discarded.size)
        val retry = mutableListOf<LspClientDescriptor>()
        provider.fileOpened(project, LightVirtualFile("nx.json"), starter(retry))
        assertEqual(1, retry.size)
        assertSame(discarded.single(), retry.single())
        harness.manager.ensureClientStarted(NxlsIntegrationProvider::class.java, retry.single())
        harness.ready()
        assertSame(retry.single(), harness.session.ready.value?.client?.descriptor)
    }

    fun testCancelledDiscoveryDoesNotPreventExplicitStart() {
        NxlsIntegrationProvider()
            .fileOpened(project, LightVirtualFile("nx.json"), starter(mutableListOf()))
        harness.session.start()
        harness.runPendingTasks()
        assertEqual(1, harness.registeredServers.size)
        harness.ready()
        assertTrue(harness.session.ready.value != null)
    }

    fun testRetiredQueuedStartCannotSuppressSameRootReplacement() {
        harness.session.start()
        harness.runLifecycleTasks()
        assertEqual(1, harness.pendingStarts.size)
        assertTrue(harness.registeredServers.isEmpty())
        val old = harness.pendingStarts.peek()
        val ticket = harness.session.restartWithRefreshTicket()
        harness.runLifecycleTasks()
        harness.runPendingTasks()
        val replacement = harness.ready()
        assertNotSame(old, replacement.descriptor)
        assertSame(replacement, harness.session.ready.value?.client)
        assertEqual(listOf(replacement), harness.registeredServers.toList())
        assertEqual(listOf(replacement.descriptor), harness.launchedDescriptors.toList())
        harness.session.workspaceRefresh(replacement.descriptor.generation, false)
        assertTrue(ticket.isCompleted)
        assertFalse(ticket.isCancelled)
    }

    fun testCrashThenOnDemandRecoveryReplacesRetainedServer() = runTest {
        val old = harness.ready(harness.start())
        harness.die(old)
        assertEqual(listOf(old), harness.registeredServers.toList())
        val response = async {
            NxlsRequestAdapter(harness.session) { testScheduler.currentTime }
                .request { it.workspaceSerialized() }
        }
        runCurrent()
        harness.runPendingTasks()
        val replacement = harness.ready()
        assertNotSame(old, replacement)
        assertSame(replacement, harness.session.ready.value?.client)
        assertEqual(listOf(replacement), harness.registeredServers.toList())
        replacement.response.complete("recovered")
        assertEqual("recovered", response.await())
        assertEqual(0, old.effects)
        assertEqual(1, replacement.effects)
    }

    fun testRetiredQueuedStartIsCleanedUpAfterExplicitStop() {
        harness.session.start()
        harness.runLifecycleTasks()
        harness.session.stop()
        harness.runLifecycleTasks()
        assertTrue(harness.registeredServers.isEmpty())
        harness.runPendingTasks()
        assertTrue(harness.registeredServers.isEmpty())
        assertTrue(harness.launchedDescriptors.isEmpty())
    }

    fun testRetiredDescriptorRejectsActualProcessLaunch() {
        val descriptor = harness.start().descriptor
        harness.session.stop()
        assertFailsWith<ProcessCanceledException> { descriptor.startServerProcess() }
    }

    fun testDifferentRootLateRegistrationPreservesReplacementRefreshTicket() {
        harness.session.start()
        harness.runLifecycleTasks()
        val old = harness.pendingStarts.remove()
        harness.session.changeWorkspace(myFixture.tempDirFixture.findOrCreateDir("nested"))
        val ticket = harness.session.restartWithRefreshTicket()
        harness.runPendingTasks()
        val replacement = harness.ready()
        val ended = checkNotNull(harness.session.ready.value).ended
        harness.manager.ensureClientStarted(NxlsIntegrationProvider::class.java, old)
        harness.runPendingTasks()
        val recovered = harness.ready()
        assertNotSame(replacement, recovered)
        assertSame(replacement.descriptor.root, recovered.descriptor.root)
        assertTrue(ended.isCompleted)
        assertEqual(listOf(recovered), harness.registeredServers.toList())
        harness.session.workspaceRefresh(recovered.descriptor.generation, false)
        assertTrue(ticket.isCompleted)
        assertFalse(ticket.isCancelled)
        assertFalse(harness.launchedDescriptors.contains(old))
    }

    fun testPlatformDoubleQueuesDeduplicatesAndRetainsCrashedServers() {
        harness.session.start()
        harness.runLifecycleTasks()
        assertTrue(harness.servers.isEmpty())
        val old = checkNotNull(harness.runNextStart())
        val sameIdentity =
            NxlsClientDescriptor(
                project,
                harness.root,
                old.descriptor.generation + 1,
                harness.session,
            )
        harness.manager.ensureClientStarted(NxlsIntegrationProvider::class.java, sameIdentity)
        assertEqual(null, harness.runNextStart())
        harness.die(old)
        assertEqual(
            listOf(old),
            harness.manager.getClients(NxlsIntegrationProvider::class.java).toList(),
        )
        harness.manager.ensureClientStarted(NxlsIntegrationProvider::class.java, sameIdentity)
        assertEqual(null, harness.runNextStart())
        harness.manager.stopClients(NxlsIntegrationProvider::class.java)
        harness.manager.ensureClientStarted(NxlsIntegrationProvider::class.java, sameIdentity)
        assertSame(sameIdentity, harness.runNextStart()?.descriptor)
    }

    fun testConcurrentRestartDuringInitializationDoesNotDeadlock() = assertInitializationCanFinish {
        harness.session.restart()
    }

    fun testConcurrentStopDuringInitializationDoesNotDeadlock() = assertInitializationCanFinish {
        harness.session.stop()
    }

    fun testConcurrentRefreshRestartDuringInitializationDoesNotDeadlock() =
        assertInitializationCanFinish {
            harness.session.restartWithRefreshTicket()
        }

    fun testConcurrentWorkspaceChangeDuringInitializationDoesNotDeadlock() =
        assertInitializationCanFinish {
            harness.session.changeWorkspace(harness.root)
        }

    private fun assertInitializationCanFinish(transition: () -> Unit) {
        val server = harness.start()
        val stopping = CountDownLatch(1)
        val initialized = CountDownLatch(1)
        val completedWhileStopping = AtomicBoolean(false)
        val executor = Executors.newFixedThreadPool(2)
        harness.onStop = {
            stopping.countDown()
            completedWhileStopping.set(initialized.await(2, TimeUnit.SECONDS))
        }
        try {
            val callback =
                executor.submit {
                    check(stopping.await(5, TimeUnit.SECONDS))
                    server.descriptor.lspServerListener.serverInitialized(server.initializeResult)
                    initialized.countDown()
                }
            val restart =
                executor.submit {
                    transition()
                    harness.runLifecycleTasks()
                }
            restart.get(5, TimeUnit.SECONDS)
            callback.get(5, TimeUnit.SECONDS)
            assertTrue(
                completedWhileStopping.get(),
                "Shutdown waited for an initialization callback blocked on the session monitor",
            )
        } finally {
            stopping.countDown()
            executor.shutdownNow()
            assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS))
        }
    }

    private fun starter(descriptors: MutableList<LspClientDescriptor>) =
        object : LspIntegrationProvider.LspClientStarter {
            override fun ensureClientStarted(descriptor: LspClientDescriptor) {
                descriptors.add(descriptor)
            }
        }
}
