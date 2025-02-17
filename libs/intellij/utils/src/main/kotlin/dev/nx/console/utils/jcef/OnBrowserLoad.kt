package dev.nx.console.utils.jcef

import com.intellij.ui.jcef.JBCefBrowser
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
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

suspend fun JBCefBrowser.awaitLoad() =
    suspendCancellableCoroutine<Unit> { continuation ->
        val loadHandler =
            object : CefLoadHandlerAdapter() {
                override fun onLoadEnd(
                    browser: CefBrowser?,
                    frame: CefFrame?,
                    httpStatusCode: Int,
                ) {
                    this@awaitLoad.jbCefClient.removeLoadHandler(this, this@awaitLoad.cefBrowser)
                    continuation.resume(Unit)
                }

                override fun onLoadError(
                    browser: CefBrowser?,
                    frame: CefFrame?,
                    errorCode: CefLoadHandler.ErrorCode?,
                    errorText: String?,
                    failedUrl: String?,
                ) {

                    continuation.resumeWithException(
                        Exception("browser failed to load, error code: $errorCode $errorText")
                    )
                }
            }

        // Register the handler to wait for the load event
        this.jbCefClient.addLoadHandler(loadHandler, this.cefBrowser)

        // If coroutine is cancelled, remove the handler
        continuation.invokeOnCancellation {
            this.jbCefClient.removeLoadHandler(loadHandler, this.cefBrowser)
        }
    }
