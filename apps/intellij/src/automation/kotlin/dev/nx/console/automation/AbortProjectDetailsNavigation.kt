package dev.nx.console.automation

import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefRequestHandlerAdapter
import org.cef.network.CefRequest

class AbortProjectDetailsNavigation : CefRequestHandlerAdapter() {
    @Volatile
    var abortedUrl: String? = null
        private set

    override fun onBeforeBrowse(
        browser: CefBrowser?,
        frame: CefFrame?,
        request: CefRequest?,
        userGesture: Boolean,
        isRedirect: Boolean,
    ): Boolean {
        val url = request?.url ?: return false
        if (frame?.isMain == true && url.startsWith("file:///nx-console-")) {
            abortedUrl = url
            return true
        }
        return false
    }
}
