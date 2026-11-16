package dev.nx.console.utils

import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Test

class ExecuteJavascriptWithCatchTest {
    @Test
    fun `disposed browser does not execute JavaScript`() = runTest {
        assertNull(executeJavascriptIfAvailable({ true }) { error("Must not execute") })
    }

    @Test
    fun `not yet initialized browser returns no result`() = runTest {
        assertNull(
            executeJavascriptIfAvailable({ false }) {
                throw IllegalStateException(
                    "Failed to execute the requested JS expression. The related JCEF browser in not initialized."
                )
            }
        )
    }

    @Test
    fun `disposal during execution returns no result`() = runTest {
        var disposed = false
        assertNull(
            executeJavascriptIfAvailable({ disposed }) {
                disposed = true
                throw IllegalStateException("Browser disposed during execution")
            }
        )
    }

    @Test
    fun `initialized browser returns JavaScript result`() = runTest {
        assertEquals("ready", executeJavascriptIfAvailable({ false }) { "ready" })
    }

    @Test
    fun `unrelated initialization errors are preserved`() = runTest {
        val failure = IllegalStateException("Some other component is not initialized")
        assertSame(
            failure,
            assertFailsWith<IllegalStateException> {
                executeJavascriptIfAvailable({ false }) { throw failure }
            },
        )
    }

    @Test
    fun `cancellation is preserved during disposal`() = runTest {
        var disposed = false
        val cancellation = CancellationException("Cancelled")
        assertSame(
            cancellation,
            assertFailsWith<CancellationException> {
                executeJavascriptIfAvailable({ disposed }) {
                    disposed = true
                    throw cancellation
                }
            },
        )
    }
}
