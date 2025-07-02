package dev.nx.console.cloud.cloud_fix_ui

import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.ui.JBColor
import com.intellij.ui.jcef.*
import com.intellij.util.ui.UIUtil
import dev.nx.console.utils.executeJavascriptWithCatch
import dev.nx.console.utils.jcef.OpenDevToolsContextMenuHandler
import dev.nx.console.utils.jcef.awaitLoad
import dev.nx.console.utils.jcef.getHexColor
import javax.swing.JComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString

class NxCloudFixFileImpl(name: String, private val project: Project) : NxCloudFixFile(name) {

    private val cs = NxCloudFixFileCoroutineHolder.getInstance(project).cs
    private var currentFixDetails: NxCloudFixDetails? = null

    override fun createMainComponent(project: Project): JComponent {
        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 100)
        browser.setPageBackgroundColor(getHexColor(UIUtil.getPanelBackground()))
        browser.jbCefClient.addContextMenuHandler(
            OpenDevToolsContextMenuHandler(),
            browser.cefBrowser
        )
        return browser.component
    }

    override fun showFixDetails(details: NxCloudFixDetails) {
        currentFixDetails = details
        cs.launch { 
            loadHtmlWithInitialData(details)
            // Update diff preview if available
            updateDiffPreview(details.runGroup.aiFix?.suggestedFix)
        }
    }

    private fun updateDiffPreview(gitDiff: String?) {
        // Find the associated editor and update its diff preview
        val fileEditorManager = com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project)
        val editors = fileEditorManager.getEditors(this)
        
        for (editor in editors) {
            when (editor) {
                is NxCloudFixEditorWithPreview -> {
                    editor.updateDiff(gitDiff)
                }
            }
        }
    }

    private suspend fun loadHtmlWithInitialData(details: NxCloudFixDetails) {
        val mockDetails = json.encodeToString(details)

        val html =
            """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <base href="http://nxcloudfix/">
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background-color: ${getHexColor(UIUtil.getPanelBackground())};
                        font-family: '${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans','Helvetica Neue', sans-serif;
                        font-size: ${UIUtil.getLabelFont().size}px;
                        color: ${getHexColor(if (!JBColor.isBright()) UIUtil.getActiveTextColor() else UIUtil.getLabelForeground())};
                    }
                </style>
            </head>
            <body>
                <script>
                    // Set initial data before any scripts load
                    globalThis.fixDetails = $mockDetails;
                </script>

                <script src="api.js"></script>
                <script src="main.js"></script>

                <root-nx-cloud-fix-element></root-nx-cloud-fix-element>
            </body>
            </html>
        """
                .trimIndent()

        withContext(Dispatchers.EDT) {
            browser.loadHTML(html)
            browser.awaitLoad()
        }

        // Setup message handling after the browser loads
        setupMessageHandling()
    }

    private fun setupMessageHandling() {
        val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
        query.addHandler { msg ->
            handleMessageFromBrowser(msg)
            null
        }

        val js =
            """
            console.log('registering post to ide callback for cloud fix');
            window.intellijApi.registerPostToIdeCallback((message) => {
                ${query.inject("message")}
            })
        """

        cs.launch { browser.executeJavascriptWithCatch(js) }
    }

    private fun handleMessageFromBrowser(message: String) {
        val logger = logger<NxCloudFixFileImpl>()
        try {
            val parsed = json.decodeFromString<NxCloudFixMessage>(message)
            logger.info("Received message from webview: $parsed")

            when (parsed) {
                is NxCloudFixMessage.Apply -> handleApply()
                is NxCloudFixMessage.ApplyLocally -> handleApplyLocally()
                is NxCloudFixMessage.Reject -> handleReject()
                is NxCloudFixMessage.ShowDiff -> handleShowDiff()
                is NxCloudFixMessage.WebviewReady -> handleWebviewReady()
            }
        } catch (e: Exception) {
            logger.error("Failed to parse message from webview", e)
        }
    }

    private fun sendFixDetailsToWebview(details: NxCloudFixDetails) {
        logger<NxCloudFixFileImpl>().info("Sending fix details to webview")

        val mockDetails = json.encodeToString(details)

        val js =
            """
            window.intellijApi.postToWebview({
                type: 'update-details',
                details: $mockDetails
            })
        """

        cs.launch { browser.executeJavascriptWithCatch(js) }
    }

    // Stub implementations - will be implemented in later commits
    private fun handleApply() {
        logger<NxCloudFixFileImpl>().info("Apply action received")
        // TODO: Implement in commit 9
    }

    private fun handleApplyLocally() {
        logger<NxCloudFixFileImpl>().info("Apply locally action received")
        // TODO: Implement in commit 9
    }

    private fun handleReject() {
        logger<NxCloudFixFileImpl>().info("Reject action received")
        // TODO: Implement in commit 9
    }

    private fun handleShowDiff() {
        logger<NxCloudFixFileImpl>().info("Show diff action received")
        // Toggle the diff preview panel
        val fileEditorManager = com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project)
        val editors = fileEditorManager.getEditors(this)
        
        for (editor in editors) {
            when (editor) {
                is NxCloudFixEditorWithPreview -> {
                    // Toggle is handled by the toolbar action
                    editor.showWithPreview()
                }
            }
        }
    }

    private fun handleWebviewReady() {
        logger<NxCloudFixFileImpl>().info("Webview ready")
        // Not needed anymore since we set initial data via HTML
    }
}

@Service(Service.Level.PROJECT)
private class NxCloudFixFileCoroutineHolder(val cs: CoroutineScope) {
    companion object {
        fun getInstance(project: Project): NxCloudFixFileCoroutineHolder =
            project.getService(NxCloudFixFileCoroutineHolder::class.java)
    }
}
