package dev.nx.console.utils

import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.ui.jcef.*
import kotlinx.coroutines.CancellationException
import org.intellij.lang.annotations.Language

suspend fun JBCefBrowser.executeJavascriptWithCatch(
    @Language("JavaScript") javaScriptExpression: String
): String? {
    if (isDisposed || !isCefBrowserCreated) return null
    return try {
        executeJavaScript(javaScriptExpression)
    } catch (e: JBCefBrowserJsCallError) {
        thisLogger().debug(e)
        null
    } catch (e: CancellationException) {
        throw e
    } catch (e: IllegalStateException) {
        if (isDisposed || !isCefBrowserCreated) null else throw e
    }
}
