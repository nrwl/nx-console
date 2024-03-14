package dev.nx.console.graph

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.ui.jcef.*
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json

class NxGraphBrowser(project: Project) : NxGraphBrowserBase(project) {

    init {
        try {
            wrappedBrowserLoadHtml(
                loadGraphHtmlBase(),
            )
        } catch (e: Throwable) {
            logger<NxGraphBrowser>().debug(e.message)
        }

        registerInteractionEventHandler(browser)
    }

    override fun refresh() {
        wrappedBrowserLoadHtml(
            loadGraphHtmlBase(),
        )
    }

    fun selectAllProjects() {
        executeWhenLoaded {
            if (browser.isDisposed) {
                thisLogger().warn("Can't select all projects because browser has been disposed.")
                return@executeWhenLoaded
            }
            browser.executeJavaScript(
                "window.waitForRouter().then(() => {console.log('navigating to all'); window.externalApi.selectAllProjects();})"
            )
        }
    }

    fun focusProject(projectName: String) {
        executeWhenLoaded {
            if (browser.isDisposed) return@executeWhenLoaded
            browser.executeJavaScript(
                "window.waitForRouter().then(() => {console.log('navigating to $projectName'); window.externalApi.focusProject('$projectName')})"
            )
        }
    }

    fun focusTargetGroup(targetGroup: String) {
        executeWhenLoaded {
            if (browser.isDisposed) return@executeWhenLoaded
            browser.executeJavaScript(
                "window.waitForRouter().then(() => {console.log('navigating to group $targetGroup'); window.externalApi.selectAllTargetsByName('$targetGroup')})"
            )
        }
    }

    fun focusTarget(projectName: String, targetName: String) {
        executeWhenLoaded {
            if (browser.isDisposed) return@executeWhenLoaded
            browser.executeJavaScript(
                "window.waitForRouter().then(() => {console.log('navigating to target $projectName:$targetName'); window.externalApi.focusTarget('$projectName','$targetName')})"
            )
        }
    }

    private fun registerInteractionEventHandler(browser: JBCefBrowser) {
        executeWhenLoaded {
            if (browser.isDisposed) return@executeWhenLoaded
            val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
            query.addHandler { msg ->
                try {
                    val messageParsed = Json.decodeFromString<NxGraphInteractionEvent>(msg)
                    val handled = handleGraphInteractionEventBase(messageParsed)
                    if (!handled) {
                        logger<NxGraphBrowser>()
                            .error("Unhandled graph interaction event: $messageParsed")
                    }
                } catch (e: SerializationException) {
                    logger<NxGraphBrowser>()
                        .error("Error parsing graph interaction event: ${e.message}")
                }
                null
            }
            val js =
                """
                window.externalApi.graphInteractionEventListener = (message) => {
                    ${query.inject("JSON.stringify(message)")}
                }
                """
            browser.executeJavaScript(js)
        }
    }
}
