package dev.nx.console.graph.ui

import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.callback.CefContextMenuParams
import org.cef.callback.CefMenuModel
import org.cef.handler.CefContextMenuHandlerAdapter

class NxGraphContextMenuHandler : CefContextMenuHandlerAdapter() {
    override fun onBeforeContextMenu(
        browser: CefBrowser?,
        frame: CefFrame?,
        params: CefContextMenuParams?,
        model: CefMenuModel?
    ) {
        model?.clear()
    }
}
