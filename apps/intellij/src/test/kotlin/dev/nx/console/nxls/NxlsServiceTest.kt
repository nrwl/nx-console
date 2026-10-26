package dev.nx.console.nxls

import com.google.gson.JsonNull
import com.google.gson.JsonParser
import com.intellij.notification.Notification
import com.intellij.notification.Notifications
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.util.ui.UIUtil
import dev.nx.console.generate.ui.GeneratorSchema
import dev.nx.console.models.CreateProjectGraphError
import dev.nx.console.models.NxDownloadAndExtractArtifactRequest
import dev.nx.console.nxls.server.NxlsLanguageServer
import dev.nx.console.nxls.server.requests.*
import dev.nx.console.utils.Notifier
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CopyOnWriteArrayList
import kotlin.test.assertEquals as assertEqual
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.future.await
import kotlinx.coroutines.runBlocking
import org.eclipse.lsp4j.jsonrpc.Endpoint
import org.eclipse.lsp4j.jsonrpc.MessageIssueException
import org.eclipse.lsp4j.jsonrpc.ResponseErrorException
import org.eclipse.lsp4j.jsonrpc.messages.MessageIssue
import org.eclipse.lsp4j.jsonrpc.messages.ResponseError
import org.eclipse.lsp4j.jsonrpc.messages.ResponseErrorCode
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage
import org.eclipse.lsp4j.jsonrpc.services.ServiceEndpoints

class NxlsServiceTest : BasePlatformTestCase() {
    private lateinit var scope: CoroutineScope
    private lateinit var service: NxlsService
    private var available = true
    private val calls = mutableListOf<Pair<String, Any?>>()
    private var response: Any? = null
    private var failure: Throwable? = null
    private val schema = GeneratorSchema("@nx/js", "library", "A library", emptyList(), null)
    private val options = NxGeneratorOptionsRequestOptions("@nx/js", "library", "libs")

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob())
        service = NxlsService(project, scope)
        val fakeService =
            ServiceEndpoints.toServiceObject(
                object : Endpoint {
                    override fun request(method: String, parameter: Any?): CompletableFuture<Any?> {
                        calls.add(method to parameter)
                        return failure?.let { CompletableFuture.failedFuture(it) }
                            ?: CompletableFuture.completedFuture(response)
                    }

                    override fun notify(method: String, parameter: Any?) {
                        calls.add(method to parameter)
                    }
                },
                NxlsLanguageServer::class.java,
            )
        service.requestSender =
            object : NxlsRequestSender {
                override suspend fun <T> request(
                    sender: (NxlsLanguageServer) -> CompletableFuture<T>
                ): T? = if (available) sender(fakeService).await() else null
            }
    }

    override fun tearDown() {
        try {
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun testUnavailableServerUsesEveryMethodFallback() = runBlocking {
        available = false
        assertFallbacks()
        service.refreshWorkspace()
        service.changeWorkspace("/workspace")
        assertTrue(calls.isEmpty())
    }

    fun testNullResponsesUseEveryMethodFallback() = runBlocking { assertFallbacks() }

    fun testCancellationUsesEveryRequestFallback() = runBlocking {
        failure = CancellationException("request cancelled")
        assertFallbacks()
    }

    fun testMessageIssuesUseFallbacksAndThrottledNotification() = runBlocking {
        val notifications = captureMessageIssueNotifications()
        failure =
            MessageIssueException(
                ResponseMessage(),
                MessageIssue(
                    "Invalid response",
                    ResponseErrorCode.ParseError.value,
                    IllegalStateException("malformed workspace"),
                ),
            )
        assertFallbacks()
        awaitNotification(notifications)
        assertEqual(1, notifications.size)
        assertTrue(notifications.single().content.contains("nx/workspace"))
        assertTrue(notifications.single().content.contains("malformed workspace"))
        notifications.forEach { it.expire() }
    }

    fun testJsonNullGeneratorResponsesUseFallbacks() = runBlocking {
        response = JsonNull.INSTANCE
        assertEqual(emptyList(), service.generators())
        assertEqual(emptyList(), service.generatorOptions(options))
        assertSame(schema, service.transformedGeneratorSchema(schema))
    }

    fun testMalformedGeneratorResponsesUseMessageIssuePolicy() = runBlocking {
        val notifications = captureMessageIssueNotifications()
        response = JsonParser.parseString("false")
        assertEqual(emptyList(), service.generators())
        assertEqual(emptyList(), service.generatorOptions(options))
        assertSame(schema, service.transformedGeneratorSchema(schema))
        awaitNotification(notifications)
        assertEqual(1, notifications.size)
        assertTrue(notifications.single().content.contains("nx/generators"))
        notifications.forEach { it.expire() }
    }

    fun testGeneratorResponsesAreDecodedByTheService() = runBlocking {
        response = JsonParser.parseString(NxlsResponseDecoderTest.generatorsJson)
        assertEqual("@nx/js:library", service.generators().single().name)
        response = JsonParser.parseString(NxlsResponseDecoderTest.optionsJson)
        assertEqual(5, service.generatorOptions(options).size)
        response = JsonParser.parseString(NxlsResponseDecoderTest.schemaJson)
        assertEqual(5, service.transformedGeneratorSchema(schema).options.size)
    }

    fun testGraphResponseErrorsAreTranslated() = runBlocking {
        failure = ResponseErrorException(ResponseError(-32001, "Project graph failed", null))
        assertEqual(
            CreateProjectGraphError(-32001, "Project graph failed"),
            service.createProjectGraph(),
        )
    }

    fun testGraphErrorStringsAreTranslated() = runBlocking {
        response = "Graph contains errors"
        assertEqual(
            CreateProjectGraphError(1000, "Graph contains errors"),
            service.createProjectGraph(true),
        )
        assertEqual("nx/createProjectGraph" to NxCreateProjectGraphRequest(true), calls.single())
    }

    fun testRequestArgumentsAndDefaults() = runBlocking {
        service.workspace()
        service.workspaceSerialized()
        service.generators()
        service.generatorOptions(options)
        service.transformedGeneratorSchema(schema)
        service.generatorContextFromPath(path = null)
        service.projectByPath("libs/test")
        service.projectsByPaths(arrayOf("libs/test", "apps/test"))
        service.createProjectGraph()
        service.startupMessage(schema)
        service.nxVersion()
        service.nxVersion(true)
        service.targetsForConfigFile("test", "libs/test/project.json")
        service.pdvData("libs/test/project.json")
        service.parseTargetString("test:build:production")
        service.downloadAndExtractArtifact("https://example.com/artifact.zip")
        val requests = calls.groupBy({ it.first }, { it.second })
        assertEqual(listOf(NxWorkspaceRequest()), requests["nx/workspace"])
        assertEqual(listOf(NxWorkspaceRequest()), requests["nx/workspaceSerialized"])
        assertEqual(listOf(NxGeneratorsRequest()), requests["nx/generators"])
        assertSame(
            options,
            (requests.getValue("nx/generatorOptions").single() as NxGeneratorOptionsRequest).options,
        )
        assertSame(schema, requests.getValue("nx/transformedGeneratorSchema").single())
        assertEqual(
            listOf(NxGetGeneratorContextFromPathRequest(null)),
            requests["nx/generatorContextV2"],
        )
        assertEqual(listOf(NxProjectByPathRequest("libs/test")), requests["nx/projectByPath"])
        assertEqual(
            listOf(NxProjectsByPathsRequest(arrayOf("libs/test", "apps/test"))),
            requests["nx/projectsByPaths"],
        )
        assertEqual(listOf(NxCreateProjectGraphRequest(false)), requests["nx/createProjectGraph"])
        assertSame(schema, requests.getValue("nx/startupMessage").single())
        assertEqual(listOf(NxVersionRequest(false), NxVersionRequest(true)), requests["nx/version"])
        assertEqual(
            listOf(NxTargetsForConfigFileRequest("test", "libs/test/project.json")),
            requests["nx/targetsForConfigFile"],
        )
        assertEqual(listOf(PDVDataRequest("libs/test/project.json")), requests["nx/pdvData"])
        assertEqual(listOf("test:build:production"), requests["nx/parseTargetString"])
        assertEqual(
            "https://example.com/artifact.zip",
            (requests.getValue("nx/downloadAndExtractArtifact").single()
                    as NxDownloadAndExtractArtifactRequest)
                .artifactUrl,
        )
    }

    fun testEditorRegistrationBeforeStartup() {
        available = false
        myFixture.configureByText("nx.json", "{}")
        val editor = myFixture.editor
        assertFalse(service.isStarted())
        assertFalse(service.isEditorConnected(editor))
        service.removeDocument(editor)
        service.addDocument(editor)
        service.addDocument(editor)
        assertTrue(service.isEditorConnected(editor))
        assertFalse(service.isStarted())
        service.removeDocument(editor)
        assertFalse(service.isEditorConnected(editor))
        service.removeDocument(editor)
    }

    private suspend fun assertFallbacks() {
        assertNull(service.workspace())
        assertNull(service.workspaceSerialized())
        assertEqual(emptyList(), service.generators())
        assertEqual(emptyList(), service.generatorOptions(options))
        assertSame(schema, service.transformedGeneratorSchema(schema))
        assertNull(service.generatorContextFromPath(path = "libs"))
        assertNull(service.projectByPath("libs/test"))
        assertEqual(emptyMap(), service.projectsByPaths(arrayOf("libs/test")))
        assertNull(service.projectGraphOutput())
        assertNull(service.createProjectGraph())
        assertNull(service.projectFolderTree())
        assertNull(service.startupMessage(schema))
        assertNull(service.nxVersion())
        assertEqual(emptyMap(), service.sourceMapFilesToProjectsMap())
        assertEqual(emptyMap(), service.targetsForConfigFile("test", "project.json"))
        assertNull(service.cloudStatus())
        assertNull(service.configureAiAgentsStatus())
        service.startDaemon()
        service.stopDaemon()
        assertNull(service.pdvData("project.json"))
        assertNull(service.parseTargetString("test:build"))
        assertNull(service.recentCIPEData())
        assertNull(service.cloudAuthHeaders())
        assertNull(service.downloadAndExtractArtifact("https://example.com/artifact.zip"))
    }

    private fun captureMessageIssueNotifications(): CopyOnWriteArrayList<Notification> {
        val throttler =
            Notifier::class.java.getDeclaredField("lspIssueExceptionThrottler").let {
                it.isAccessible = true
                it.get(null)
            }
        throttler.javaClass.getDeclaredField("lastExecutionTime").apply {
            isAccessible = true
            setLong(throttler, 0)
        }
        val notifications = CopyOnWriteArrayList<Notification>()
        project.messageBus
            .connect(testRootDisposable)
            .subscribe(
                Notifications.TOPIC,
                object : Notifications {
                    override fun notify(notification: Notification) {
                        if (notification.groupId == "Nx Console") notifications.add(notification)
                    }
                },
            )
        return notifications
    }

    private fun awaitNotification(notifications: List<Notification>) {
        val deadline = System.nanoTime() + 5_000_000_000L
        while (notifications.isEmpty() && System.nanoTime() < deadline) {
            UIUtil.dispatchAllInvocationEvents()
            Thread.sleep(10)
        }
        assertFalse(notifications.isEmpty(), "No message issue notification was delivered")
    }
}
