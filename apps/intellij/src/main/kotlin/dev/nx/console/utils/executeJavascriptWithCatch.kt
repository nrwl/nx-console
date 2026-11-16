package dev.nx.console.utils

import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserJsCallError
import com.intellij.ui.jcef.executeJavaScript
import kotlinx.coroutines.CancellationException
import org.intellij.lang.annotations.Language

suspend fun JBCefBrowser.executeJavascriptWithCatch(
    @Language("JavaScript") javaScriptExpression: String
): String? =
    executeJavascriptIfAvailable({ isDisposed }) {
        try {
            executeJavaScript(javaScriptExpression)
        } catch (e: JBCefBrowserJsCallError) {
            thisLogger().debug(e)
            null
        }
    }

internal suspend fun executeJavascriptIfAvailable(
    isDisposed: () -> Boolean,
    execute: suspend () -> String?,
): String? {
    if (isDisposed()) return null
    return try {
        execute()
    } catch (e: CancellationException) {
        throw e
    } catch (e: IllegalStateException) {
        // JCEF checks native readiness itself, including delegated browsers.
        if (
            isDisposed() ||
                e.message ==
                    "Failed to execute the requested JS expression. The related JCEF browser in not initialized."
        ) {
            null
        } else {
            throw e
        }
    }
}
