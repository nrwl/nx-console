package dev.nx.console.nxls

import dev.nx.console.nxls.server.NxlsLanguageServer
import kotlin.test.assertEquals
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
