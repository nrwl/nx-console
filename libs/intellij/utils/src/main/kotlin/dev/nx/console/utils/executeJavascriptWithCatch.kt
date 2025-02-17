package dev.nx.console.utils

import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.ui.jcef.*
import org.intellij.lang.annotations.Language

suspend fun JBCefBrowser.executeJavascriptWithCatch(
    @Language("JavaScript") javaScriptExpression: String
): String? {
    return try {
        executeJavaScript(javaScriptExpression)
    } catch (e: JBCefBrowserJsCallError) {
        thisLogger().debug(e)
        null
    }
}
