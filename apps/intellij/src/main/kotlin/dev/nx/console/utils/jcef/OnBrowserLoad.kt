package dev.nx.console.utils.jcef

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.EDT
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefBrowser
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandler
import org.cef.handler.CefLoadHandlerAdapter
import org.cef.network.CefRequest

fun onBrowserLoadEnd(browser: JBCefBrowser, onLoadEnd: () -> Unit) {
    browser.jbCefClient.addLoadHandler(
        object : CefLoadHandler {
            override fun onLoadingStateChange(
                browser: CefBrowser?,
                isLoading: Boolean,
                canGoBack: Boolean,
                canGoForward: Boolean,
            ) {
                return
            }

            override fun onLoadStart(
                browser: CefBrowser?,
                frame: CefFrame?,
                transitionType: CefRequest.TransitionType?,
            ) {
                return
            }

            override fun onLoadEnd(cefBrowser: CefBrowser?, frame: CefFrame?, httpStatusCode: Int) {
                onLoadEnd()
            }

            override fun onLoadError(
                browser: CefBrowser?,
                frame: CefFrame?,
                errorCode: CefLoadHandler.ErrorCode?,
                errorText: String?,
                failedUrl: String?,
            ) {
                return
            }
        },
        browser.cefBrowser,
    )
}

private const val LOAD_TRACKER_PROPERTY = "nx.console.htmlLoadTracker"

/** Returns false when navigation is aborted, without treating it as JavaScript readiness. */
suspend fun JBCefBrowser.loadHtmlAndAwait(html: String): Boolean =
    withContext(Dispatchers.EDT) {
        // CEF can deliver the previous navigation's cancellation after a replacement starts.
        val url = "file:///nx-console-${UUID.randomUUID()}.html"
        val tracker =
            (getProperty(LOAD_TRACKER_PROPERTY) as? BrowserLoadTracker)
                ?: BrowserLoadTracker().also { setProperty(LOAD_TRACKER_PROPERTY, it) }
        val handler = tracker.start(url)
        val disposable = Disposable {
            handler.completion.cancel(CancellationException("Browser disposed"))
        }
        try {
            if (!Disposer.tryRegister(this@loadHtmlAndAwait, disposable)) {
                throw CancellationException("Browser disposed")
            }
            jbCefClient.addLoadHandler(handler, cefBrowser)
            loadHTML(html, url)
            handler.completion.await()
        } finally {
            tracker.finish(handler)
            jbCefClient.removeLoadHandler(handler, cefBrowser)
            Disposer.dispose(disposable)
        }
    }

internal class BrowserLoadTracker {
    private var current: BrowserLoadHandler? = null

    fun start(url: String): BrowserLoadHandler {
        // Before native creation, JCEF replaces its deferred load without an abort callback.
        current?.completion?.complete(false)
        return BrowserLoadHandler(url).also { current = it }
    }

    fun finish(handler: BrowserLoadHandler) {
        if (current === handler) current = null
    }
}

internal class BrowserLoadHandler(private val url: String) : CefLoadHandlerAdapter() {
    val completion = CompletableDeferred<Boolean>()

    override fun onLoadEnd(browser: CefBrowser?, frame: CefFrame?, httpStatusCode: Int) {
        if (frame?.isMain == true && frame.url?.substringBefore('#') == url)
            completion.complete(true)
    }

    override fun onLoadError(
        browser: CefBrowser?,
        frame: CefFrame?,
        errorCode: CefLoadHandler.ErrorCode?,
        errorText: String?,
        failedUrl: String?,
    ) {
        if (frame?.isMain != true || failedUrl?.substringBefore('#') != url) return
        if (errorCode == CefLoadHandler.ErrorCode.ERR_ABORTED) {
            completion.complete(false)
        } else {
            completion.completeExceptionally(
                IllegalStateException("Browser failed to load: $errorCode $errorText")
            )
        }
    }
}
