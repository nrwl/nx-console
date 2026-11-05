package dev.nx.console.utils.jcef

import com.intellij.openapi.Disposable
import com.intellij.ui.jcef.utils.JBCefStreamResourceHandler
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefRequestHandlerAdapter
import org.cef.handler.CefResourceHandler
import org.cef.handler.CefResourceRequestHandler
import org.cef.handler.CefResourceRequestHandlerAdapter
import org.cef.misc.BoolRef
import org.cef.network.CefRequest

/**
 * A per-browser request handler that serves classpath resources for a given scheme + authority.
 *
 * Unlike CefApp.registerSchemeHandlerFactory() which registers globally on the backend CEF app,
 * this handler is registered per-browser via JBCefClient.addRequestHandler() and works correctly in
 * remote development environments (JetBrains Gateway, WSL, dev containers).
 */
class ClasspathResourceRequestHandler(
    scheme: String,
    authority: String,
    private val resourceFolder: String,
    private val parentDisposable: Disposable,
) : CefRequestHandlerAdapter() {

    private val urlPrefix = "$scheme://$authority"

    override fun getResourceRequestHandler(
        browser: CefBrowser?,
        frame: CefFrame?,
        request: CefRequest?,
        isNavigation: Boolean,
        isDownload: Boolean,
        requestInitiator: String?,
        disableDefaultHandling: BoolRef?,
    ): CefResourceRequestHandler? {
        val url = request?.url ?: return null
        if (!url.startsWith(urlPrefix)) return null

        val path = url.removePrefix(urlPrefix).removePrefix("/")
        if (path.isEmpty()) return null

        return object : CefResourceRequestHandlerAdapter() {
            override fun getResourceHandler(
                browser: CefBrowser?,
                frame: CefFrame?,
                request: CefRequest?,
            ): CefResourceHandler? {
                val stream =
                    javaClass.classLoader.getResourceAsStream("$resourceFolder/$path")
                        ?: return null
                return JBCefStreamResourceHandler(stream, getMimeType(path), parentDisposable)
            }
        }
    }
}

private fun getMimeType(path: String): String {
    return when {
        path.endsWith(".html") -> "text/html"
        path.endsWith(".css") -> "text/css"
        path.endsWith(".js") -> "text/javascript"
        path.endsWith(".svg") -> "image/svg+xml"
        else -> "application/octet-stream"
    }
}
