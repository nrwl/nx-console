package dev.nx.console.utils.jcef

import com.intellij.openapi.Disposable
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefBrowser
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
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

/** Returns false when navigation is aborted, without treating it as JavaScript readiness. */
suspend fun JBCefBrowser.loadHtmlAndAwait(html: String): Boolean {
    // CEF can deliver the previous navigation's cancellation after a replacement starts.
    val url = "file:///nx-console-${UUID.randomUUID()}.html"
    val handler = BrowserLoadHandler(url)
    val disposable = Disposable {
        handler.completion.cancel(CancellationException("Browser disposed"))
    }
    if (!Disposer.tryRegister(this, disposable)) {
        throw CancellationException("Browser disposed")
    }
    try {
        jbCefClient.addLoadHandler(handler, cefBrowser)
        loadHTML(html, url)
        return handler.completion.await()
    } finally {
        jbCefClient.removeLoadHandler(handler, cefBrowser)
        Disposer.dispose(disposable)
    }
}

internal class BrowserLoadHandler(private val url: String) : CefLoadHandlerAdapter() {
    val completion = CompletableDeferred<Boolean>()

    override fun onLoadEnd(browser: CefBrowser?, frame: CefFrame?, httpStatusCode: Int) {
        if (frame?.isMain == true && frame.url == url) completion.complete(true)
    }

    override fun onLoadError(
        browser: CefBrowser?,
        frame: CefFrame?,
        errorCode: CefLoadHandler.ErrorCode?,
        errorText: String?,
        failedUrl: String?,
    ) {
        if (frame?.isMain != true || failedUrl != url) return
        if (errorCode == CefLoadHandler.ErrorCode.ERR_ABORTED) {
            completion.complete(false)
        } else {
            completion.completeExceptionally(
                IllegalStateException("Browser failed to load: $errorCode $errorText")
            )
        }
    }
}
