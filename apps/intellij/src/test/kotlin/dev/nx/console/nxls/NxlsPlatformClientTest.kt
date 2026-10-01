package dev.nx.console.nxls

import com.intellij.platform.lsp.api.LspServerNotificationsHandler
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.nxls.client.FileWatcherOperationalParams
import dev.nx.console.nxls.client.NxlsLsp4jClient
import dev.nx.console.utils.NxConsoleLogger
import java.lang.reflect.Proxy
import java.util.concurrent.CompletableFuture
import kotlin.test.assertEquals as assertEqual
import kotlin.test.assertSame
import kotlin.test.assertTrue
import org.eclipse.lsp4j.ApplyWorkspaceEditParams
import org.eclipse.lsp4j.ConfigurationParams
import org.eclipse.lsp4j.MessageParams
import org.eclipse.lsp4j.MessageType
import org.eclipse.lsp4j.PublishDiagnosticsParams
import org.eclipse.lsp4j.jsonrpc.services.ServiceEndpoints

class NxlsPlatformClientTest : BasePlatformTestCase() {
    private lateinit var harness: PlatformLspTestHarness
    private lateinit var client: NxlsLsp4jClient
    private val delegated = mutableListOf<Pair<String, Any?>>()
    private val response = CompletableFuture.completedFuture(null)
    private var refreshed = 0
    private var started = 0

    override fun setUp() {
        super.setUp()
        harness = PlatformLspTestHarness(project, myFixture.tempDirFixture.getFile(".")!!)
        val handler =
            Proxy.newProxyInstance(
                LspServerNotificationsHandler::class.java.classLoader,
                arrayOf(LspServerNotificationsHandler::class.java),
            ) { _, method, args ->
                delegated.add(method.name to args?.firstOrNull())
                if (method.returnType == CompletableFuture::class.java) response else null
            } as LspServerNotificationsHandler
        client = harness.start().descriptor.createLsp4jClient(handler)
        project.messageBus.connect(testRootDisposable).apply {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener { refreshed++ },
            )
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_STARTED_TOPIC,
                NxWorkspaceRefreshStartedListener { started++ },
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

    fun testAllCustomWireNotificationsReachExistingDestinations() {
        harness.ready()
        val endpoint = ServiceEndpoints.toEndpoint(client)
        endpoint.notify("nx/refreshWorkspace", null)
        endpoint.notify("nx/refreshWorkspaceStarted", null)
        endpoint.notify("nx/fileWatcherOperational", FileWatcherOperationalParams("running"))
        assertEqual(1, refreshed)
        assertEqual(2, started)
        assertEqual("running", WatcherRunningService.getInstance(project).status.value)
    }

    fun testRetiredClientNotificationsAreDiscarded() {
        client.fileWatcherOperational(FileWatcherOperationalParams("running"))
        harness.session.restart()
        client.refreshWorkspace()
        client.refreshWorkspaceStarted()
        client.fileWatcherOperational(FileWatcherOperationalParams("stopped"))
        assertEqual(0, refreshed)
        assertEqual(0, started)
        assertEqual("running", WatcherRunningService.getInstance(project).status.value)
    }

    fun testFinalLogMessageCallbackLogsThenDelegates() {
        NxConsoleLogger.getInstance().clearLogs()
        val message = MessageParams(MessageType.Log, "platform nxls log test\n")
        client.logMessage(message)
        assertTrue(
            NxConsoleLogger.getInstance().readLogContent().contains("platform nxls log test\n")
        )
        assertEqual(listOf<Pair<String, Any?>>("logMessage" to message), delegated)
        assertTrue(
            !NxConsoleLogger.getInstance().readLogContent().contains("platform nxls log test\n\n")
        )
    }

    fun testOtherCallbacksPreserveArgumentsAndFutures() {
        val configuration = ConfigurationParams(emptyList())
        val edit = ApplyWorkspaceEditParams()
        val diagnostics = PublishDiagnosticsParams("file:///nx.json", emptyList())
        assertSame(response, client.configuration(configuration))
        assertSame(response, client.applyEdit(edit))
        client.publishDiagnostics(diagnostics)
        client.showMessage(MessageParams(MessageType.Info, "message"))
        assertEqual(
            listOf("configuration", "applyEdit", "publishDiagnostics", "showMessage"),
            delegated.map { it.first },
        )
        assertSame(configuration, delegated[0].second)
        assertSame(edit, delegated[1].second)
        assertSame(diagnostics, delegated[2].second)
    }
}
