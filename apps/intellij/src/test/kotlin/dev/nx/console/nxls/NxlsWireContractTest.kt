package dev.nx.console.nxls

import dev.nx.console.nxls.server.NxlsLanguageServer
import java.util.concurrent.CompletableFuture
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue
import org.eclipse.lsp4j.jsonrpc.Endpoint
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler
import org.eclipse.lsp4j.jsonrpc.messages.RequestMessage
import org.eclipse.lsp4j.jsonrpc.services.ServiceEndpoints
import org.eclipse.lsp4j.services.LanguageServer
import org.junit.Test

class NxlsWireContractTest {
    @Test
    fun customWireMethodsRemainStable() {
        // lsp4j recursively walks the annotations, inherited interfaces and JsonDelegate methods.
        val methods = ServiceEndpoints.getSupportedMethods(NxlsLanguageServer::class.java)
        val standardMethods = ServiceEndpoints.getSupportedMethods(LanguageServer::class.java)
        assertEquals(expectedRequests + expectedNotifications, methods.keys - standardMethods.keys)
        assertEquals(
            expectedNotifications,
            methods
                .filterKeys { it in expectedRequests + expectedNotifications }
                .filterValues { it.isNotification }
                .keys,
        )
    }

    @Test
    fun requestsWithoutArgumentsStillSendParams() {
        val sent = mutableMapOf<String, Any?>()
        val endpoint =
            object : Endpoint {
                override fun request(method: String, parameter: Any?): CompletableFuture<*> {
                    sent[method] = parameter
                    return CompletableFuture.completedFuture(null)
                }

                override fun notify(method: String, parameter: Any?) {}
            }
        val server = ServiceEndpoints.toServiceObject(endpoint, NxlsLanguageServer::class.java)

        server.projectGraphOutput()
        server.projectFolderTree()
        server.sourceMapFilesToProjectsMap()
        server.stopDaemon()
        server.startDaemon()
        server.cloudStatus()
        server.configureAiAgentsStatus()
        server.recentCIPEData()
        server.cloudAuthHeaders()

        val jsonHandler =
            MessageJsonHandler(ServiceEndpoints.getSupportedMethods(NxlsLanguageServer::class.java))
        assertEquals(9, sent.size)
        sent.forEach { (method, params) ->
            // nxls rejects these requests when `params` is missing, and lsp4j 1.0 omits null
            // params.
            assertNotNull(params, "$method sends null params")
            val message =
                RequestMessage().apply {
                    jsonrpc = "2.0"
                    id = "1"
                    this.method = method
                    this.params = params
                }
            val json = jsonHandler.serialize(message)
            assertTrue(json.contains("\"params\":{}"), "$method serializes as $json")
        }
    }

    private val expectedRequests =
        setOf(
            "nx/workspace",
            "nx/workspaceSerialized",
            "nx/generators",
            "nx/generatorOptions",
            "nx/transformedGeneratorSchema",
            "nx/generatorContextV2",
            "nx/projectByPath",
            "nx/projectsByPaths",
            "nx/projectGraphOutput",
            "nx/createProjectGraph",
            "nx/projectFolderTree",
            "nx/startupMessage",
            "nx/version",
            "nx/sourceMapFilesToProjectsMap",
            "nx/targetsForConfigFile",
            "nx/stopDaemon",
            "nx/startDaemon",
            "nx/cloudStatus",
            "nx/configureAiAgentsStatus",
            "nx/pdvData",
            "nx/parseTargetString",
            "nx/recentCIPEData",
            "nx/cloudAuthHeaders",
            "nx/downloadAndExtractArtifact",
        )

    private val expectedNotifications = setOf("nx/changeWorkspace", "nx/refreshWorkspace")
}
