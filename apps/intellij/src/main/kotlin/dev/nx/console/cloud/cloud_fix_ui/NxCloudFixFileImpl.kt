package dev.nx.console.cloud.cloud_fix_ui

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.ui.JBColor
import com.intellij.ui.JBSplitter
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.components.JBTextArea
import com.intellij.ui.jcef.*
import com.intellij.util.ui.UIUtil
import dev.nx.console.utils.executeJavascriptWithCatch
import dev.nx.console.utils.jcef.OpenDevToolsContextMenuHandler
import dev.nx.console.utils.jcef.awaitLoad
import dev.nx.console.utils.jcef.getHexColor
import java.awt.BorderLayout
import java.awt.Font
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.SwingConstants
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

    // UI Components
    private val mainPanel = JPanel(BorderLayout())
    private val toolbar = createToolbar()
    private val splitter = JBSplitter(false, 0.6f) // 60% webview, 40% diff
    private val diffPanel = JPanel(BorderLayout())
    private var isShowingPreview = false
    private var currentDiff: String? = null

    override fun createMainComponent(project: Project): JComponent {
        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 100)
        browser.setPageBackgroundColor(getHexColor(UIUtil.getPanelBackground()))
        browser.jbCefClient.addContextMenuHandler(
            OpenDevToolsContextMenuHandler(),
            browser.cefBrowser
        )

        // Setup the main UI
        mainPanel.add(toolbar, BorderLayout.NORTH)
        mainPanel.add(splitter, BorderLayout.CENTER)

        // Start with webview only
        showWebviewOnly()

        return mainPanel
    }

    override fun showFixDetails(details: NxCloudFixDetails) {
        // Test serialization first to catch any issues early
        try {
            json.encodeToString(details)
        } catch (e: Exception) {
            logger<NxCloudFixFileImpl>().error("Failed to serialize fix details", e)

            // Show error notification
            com.intellij.notification.NotificationGroupManager.getInstance()
                .getNotificationGroup("Nx Cloud CIPE")
                .createNotification(
                    "Failed to Load AI Fix",
                    "Could not parse AI fix data: ${e.message}",
                    com.intellij.notification.NotificationType.ERROR
                )
                .notify(project)

            return
        }

        currentFixDetails = details
        cs.launch {
            loadHtmlWithInitialData(details)
            // Update diff preview if available
            updateDiffPreview(details.runGroup.aiFix?.suggestedFix)
        }
    }

    private fun updateDiffPreview(gitDiff: String?) {
        currentDiff = gitDiff
        if (gitDiff != null && gitDiff.isNotBlank()) {
            showGitDiff(gitDiff)
            // Automatically show preview if there's a diff
            if (!isShowingPreview) {
                showWithPreview()
            }
        } else {
            showDiffPlaceholder()
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
        togglePreview()
    }

    // UI Helper Methods
    private fun showWithPreview() {
        if (!isShowingPreview) {
            splitter.firstComponent = browser.component
            splitter.secondComponent = diffPanel
            splitter.isShowDividerControls = true
            splitter.isShowDividerIcon = true
            isShowingPreview = true
        }
    }

    private fun showWebviewOnly() {
        splitter.firstComponent = browser.component
        splitter.secondComponent = null
        isShowingPreview = false
    }

    private fun togglePreview() {
        if (isShowingPreview) {
            showWebviewOnly()
        } else {
            showWithPreview()
        }
    }

    private fun createToolbar(): JComponent {
        val toggleDiffAction = object : AnAction("Toggle Diff", "Toggle diff preview", AllIcons.Actions.Diff), DumbAware {
            override fun actionPerformed(e: AnActionEvent) {
                togglePreview()
            }

            override fun update(e: AnActionEvent) {
                e.presentation.icon = if (isShowingPreview) AllIcons.Actions.PreviewDetails else AllIcons.Actions.Diff
            }
        }

        val actionGroup = DefaultActionGroup(toggleDiffAction)
        val toolbar = ActionManager.getInstance().createActionToolbar(ActionPlaces.EDITOR_TOOLBAR, actionGroup, true)
        toolbar.targetComponent = mainPanel
        return toolbar.component
    }

    private fun showGitDiff(gitDiff: String) {
        diffPanel.removeAll()

        // For now, show raw diff in a text area
        // In a later commit, this will be replaced with proper IntelliJ diff viewer
        val textArea = JBTextArea(gitDiff)
        textArea.isEditable = false
        textArea.font = Font(Font.MONOSPACED, Font.PLAIN, 12)

        val scrollPane = JBScrollPane(textArea)
        diffPanel.add(scrollPane, BorderLayout.CENTER)

        diffPanel.revalidate()
        diffPanel.repaint()
    }

    private fun showDiffPlaceholder() {
        diffPanel.removeAll()
        diffPanel.add(
            JBLabel("Git diff will appear here when an AI fix is available", SwingConstants.CENTER),
            BorderLayout.CENTER
        )
        diffPanel.revalidate()
        diffPanel.repaint()
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
