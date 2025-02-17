package dev.nx.console.graph.ui

import org.cef.browser.CefBrowser
import org.cef.callback.CefBeforeDownloadCallback
import org.cef.callback.CefDownloadItem
import org.cef.handler.CefDownloadHandlerAdapter

class NxGraphDownloadHandler : CefDownloadHandlerAdapter() {
    override fun onBeforeDownload(
        browser: CefBrowser?,
        downloadItem: CefDownloadItem?,
        suggestedName: String?,
        callback: CefBeforeDownloadCallback
    ) {
        callback.Continue(suggestedName, true)
    }
}
