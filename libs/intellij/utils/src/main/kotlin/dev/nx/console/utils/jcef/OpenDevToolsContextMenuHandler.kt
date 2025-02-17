package dev.nx.console.utils.jcef

import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.callback.CefContextMenuParams
import org.cef.callback.CefMenuModel
import org.cef.handler.CefContextMenuHandlerAdapter

class OpenDevToolsContextMenuHandler : CefContextMenuHandlerAdapter() {
    override fun onBeforeContextMenu(
        browser: CefBrowser?,
        frame: CefFrame?,
        params: CefContextMenuParams?,
        model: CefMenuModel?
    ) {
        if (model == null) {
            return
        }
        model.clear()
        // 28500 is the magic command id to open the devtools
        model.addItem(28500, "Open DevTools")
    }
}
