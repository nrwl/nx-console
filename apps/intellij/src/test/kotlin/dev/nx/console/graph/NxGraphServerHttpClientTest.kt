package dev.nx.console.graph

import NxGraphServer
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import java.time.Duration
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

class NxGraphServerHttpClientTest : BasePlatformTestCase() {

    private lateinit var scope: CoroutineScope

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    }

    override fun tearDown() {
        try {
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun testGraphRequestsShareOneHttpClient() {
        val server = NxGraphServer(project, 5580, false, scope)
        try {
            val client = server.obtainHttpClient()
            assertSame(client, server.obtainHttpClient())
            assertSame(client, server.obtainHttpClient())
        } finally {
            server.dispose()
        }
    }

    fun testDisposeShutsTheClientDownAndTheNextRequestGetsAFreshOne() {
        val server = NxGraphServer(project, 5580, false, scope)
        val disposed = server.obtainHttpClient()

        server.dispose()

        assertTrue(
            "dispose() must shut the shared client down",
            disposed.awaitTermination(Duration.ofSeconds(10)),
        )
        val afterRestart = server.obtainHttpClient()
        assertNotSame(disposed, afterRestart)
        server.dispose()
    }
}
