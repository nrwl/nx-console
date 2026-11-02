package dev.nx.console.utils.jcef

import java.lang.reflect.Proxy
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.test.runTest
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandler.ErrorCode
import org.junit.Test

class BrowserLoadHandlerTest {
    private val url = "file:///nx-console-current.html"
    private val previousUrl = "file:///nx-console-previous.html"

    private fun frame(main: Boolean = true, frameUrl: String = url): CefFrame =
        Proxy.newProxyInstance(CefFrame::class.java.classLoader, arrayOf(CefFrame::class.java)) {
            _,
            method,
            _ ->
            when (method.name) {
                "isMain" -> main
                "getURL" -> frameUrl
                else -> error("Unexpected frame call: ${method.name}")
            }
        } as CefFrame

    @Test
    fun subframesCannotCompleteTheMainPageLoad() = runTest {
        val handler = BrowserLoadHandler(url)
        handler.onLoadEnd(null, frame(false), 200)
        handler.onLoadError(null, frame(false), ErrorCode.ERR_FAILED, "failed", url)
        assertFalse(handler.completion.isCompleted)
        handler.onLoadEnd(null, frame(), 200)
        assertTrue(handler.completion.await())
    }

    @Test
    fun abortedNavigationDoesNotCountAsReadinessEvenWhenLoadEndFollows() = runTest {
        val handler = BrowserLoadHandler(url)
        handler.onLoadError(null, frame(), ErrorCode.ERR_ABORTED, "aborted", url)
        handler.onLoadEnd(null, frame(), 0)
        assertFalse(handler.completion.await())
    }

    @Test
    fun aPreviousNavigationsLateCallbacksCannotCompleteTheNewLoad() = runTest {
        val handler = BrowserLoadHandler(url)
        handler.onLoadError(null, frame(), ErrorCode.ERR_ABORTED, "aborted", previousUrl)
        handler.onLoadEnd(null, frame(frameUrl = previousUrl), 200)
        assertFalse(handler.completion.isCompleted)
        handler.onLoadEnd(null, frame(), 200)
        assertTrue(handler.completion.await())
    }

    @Test
    fun failureFollowedByLoadEndKeepsTheOriginalFailure() = runTest {
        val handler = BrowserLoadHandler(url)
        handler.onLoadError(null, frame(), ErrorCode.ERR_FAILED, "failed", url)
        handler.onLoadEnd(null, frame(), 200)
        assertFailsWith<IllegalStateException> { handler.completion.await() }
    }

    @Test
    fun duplicateCallbacksAfterCompletionAreHarmless() = runTest {
        val handler = BrowserLoadHandler(url)
        handler.onLoadEnd(null, frame(), 200)
        handler.onLoadEnd(null, frame(), 200)
        handler.onLoadError(null, frame(), ErrorCode.ERR_ABORTED, "aborted", url)
        assertTrue(handler.completion.await())
    }
}
