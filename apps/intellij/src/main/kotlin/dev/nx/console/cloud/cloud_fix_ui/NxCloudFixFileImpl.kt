package dev.nx.console.cloud.cloud_fix_ui

import com.intellij.diff.chains.SimpleDiffRequestChain
import com.intellij.diff.impl.CacheDiffRequestChainProcessor
import com.intellij.diff.requests.DiffRequest
import com.intellij.diff.util.DiffUserDataKeys
import com.intellij.diff.util.DiffUserDataKeysEx
import com.intellij.icons.AllIcons
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diff.impl.patch.PatchReader
import com.intellij.openapi.diff.impl.patch.PatchSyntaxException
import com.intellij.openapi.diff.impl.patch.TextFilePatch
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vcs.changes.patch.tool.PatchDiffRequest
import com.intellij.ui.JBColor
import com.intellij.ui.JBSplitter
import com.intellij.ui.components.JBLabel
import com.intellij.ui.jcef.*
import com.intellij.util.ui.JBUI
import com.intellij.util.ui.UIUtil
import dev.nx.console.cloud.CIPEPollingService
import dev.nx.console.cloud.NxCloudApiService
import dev.nx.console.utils.executeJavascriptWithCatch
import dev.nx.console.utils.jcef.OpenDevToolsContextMenuHandler
import dev.nx.console.utils.jcef.awaitLoad
import dev.nx.console.utils.jcef.getHexColor
import java.awt.*
import javax.swing.*
import javax.swing.UIManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString

@Serializable
data class NxCloudFixStyles(
    val foregroundColor: String,
    val mutedForegroundColor: String,
    val backgroundColor: String,
    val primaryColor: String,
    val errorColor: String,
    val fieldBackgroundColor: String,
    val fieldBorderColor: String,
    val selectFieldBackgroundColor: String,
    val activeSelectionBackgroundColor: String,
    val focusBorderColor: String,
    val bannerWarningBackgroundColor: String,
    val bannerTextColor: String,
    val badgeBackgroundColor: String,
    val badgeForegroundColor: String,
    val separatorColor: String,
    val fieldNavHoverColor: String,
    val scrollbarThumbColor: String,
    val fontFamily: String,
    val fontSize: String,
    // Cloud fix specific colors
    val successColor: String,
    val warningColor: String,
    val hoverColor: String,
    val borderColor: String,
    val secondaryColor: String,
    val secondaryForegroundColor: String
)

class NxCloudFixFileImpl(name: String, private val project: Project) : NxCloudFixFile(name) {

    private val cs = NxCloudFixFileCoroutineHolder.getInstance(project).cs
    private var currentFixDetails: NxCloudFixDetails? = null

    // UI Components
    private val mainPanel = JPanel(BorderLayout())
    private val toolbar = createToolbar()
    private val splitter = JBSplitter(false, 0.6f) // 60% webview, 40% diff
    private val diffContainer = JPanel(BorderLayout())
    private var diffProcessor: CacheDiffRequestChainProcessor? = null
    private var isShowingPreview = false
    private var currentDiff: String? = null

    init {
        // Initialize diff container
        diffContainer.background = UIUtil.getPanelBackground()
        showDiffPlaceholder()
    }

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
        cs.launch { updateDiff(gitDiff) }

        // Automatically show preview if there's a diff
        if (gitDiff != null && gitDiff.isNotBlank() && !isShowingPreview) {
            showWithPreview()
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
                <link href="main.css" rel="stylesheet">
                <link href="tailwind.css" rel="stylesheet">
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background-color: ${getHexColor(UIUtil.getPanelBackground())};
                        font-family: '${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans','Helvetica Neue', sans-serif;
                        font-size: ${UIUtil.getLabelFont().size}px;
                        color: ${getHexColor(if (!com.intellij.ui.JBColor.isBright()) UIUtil.getActiveTextColor() else UIUtil.getLabelForeground())};
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

        cs.launch {
            browser.executeJavascriptWithCatch(js)

            // Send styles to webview
            val styles = extractIntellijStyles()
            val stylesJson = json.encodeToString(styles)
            val stylesJs =
                """
                window.intellijApi.postToWebview({
                    type: 'styles',
                    payload: $stylesJson
                })
            """
            browser.executeJavascriptWithCatch(stylesJs)
        }
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

    private fun handleApply() {
        logger<NxCloudFixFileImpl>().info("Apply action received")

        val fixDetails = currentFixDetails ?: return
        val aiFixId =
            fixDetails.runGroup.aiFix?.aiFixId
                ?: run {
                    showErrorNotification("No AI fix ID found")
                    return
                }

        cs.launch {
            logger<NxCloudFixFileImpl>().info("Starting coroutine to apply fix")
            try {
                val cloudApiService = NxCloudApiService.getInstance(project)
                logger<NxCloudFixFileImpl>()
                    .info("Got cloud API service, calling updateSuggestedFix")
                val success = cloudApiService.updateSuggestedFix(aiFixId, "APPLIED")

                if (success) {
                    showSuccessNotification("Nx Cloud fix applied successfully")
                    // Refresh CIPE data
                    CIPEPollingService.getInstance(project).forcePoll()
                    // Close the AI fix editor
                    withContext(Dispatchers.EDT) {
                        FileEditorManager.getInstance(project).closeFile(this@NxCloudFixFileImpl)
                    }
                } else {
                    showErrorNotification("Failed to apply AI fix")
                }
            } catch (e: Exception) {
                logger<NxCloudFixFileImpl>().error("Failed to apply AI fix", e)
                showErrorNotification("Failed to apply AI fix: ${e.message}")
            }
        }
    }

    private fun handleApplyLocally() {
        logger<NxCloudFixFileImpl>().info("Apply locally action received")
        //
        //        val fixDetails = currentFixDetails ?: return
        //        val suggestedFix =
        //            fixDetails.runGroup.aiFix?.suggestedFix
        //                ?: run {
        //                    showErrorNotification("No AI fix available to apply locally")
        //                    return
        //                }
        //        val aiFixId =
        //            fixDetails.runGroup.aiFix?.aiFixId
        //                ?: run {
        //                    showErrorNotification("No AI fix ID found")
        //                    return
        //                }
        //
        //        cs.launch {
        //            try {
        //                // Create a temporary patch file
        //                val tempFile =
        //                    withContext(Dispatchers.IO) {
        //                        val temp = Files.createTempFile("nx-cloud-fix-", ".patch")
        //
        //                        // Ensure the patch ends with a newline
        //                        val patchContent =
        //                            if (suggestedFix.endsWith("\n")) {
        //                                suggestedFix
        //                            } else {
        //                                suggestedFix + "\n"
        //                            }
        //
        //                        Files.write(temp, patchContent.toByteArray(),
        // StandardOpenOption.WRITE)
        //                        temp.toFile()
        //                    }
        //
        //                try {
        //                    // Apply the git patch
        //                    val projectRoot =
        //                        project.basePath ?: throw Exception("Project base path not found")
        //
        //                    val commandLine =
        //                        GeneralCommandLine()
        //                            .withWorkDirectory(projectRoot)
        //                            .withExePath("git")
        //                            .withParameters("apply", tempFile.absolutePath)
        //
        //                    val exitCode =
        //                        withContext(Dispatchers.IO) {
        //                            try {
        //                                val process = commandLine.createProcess()
        //                                process.waitFor()
        //                            } catch (e: Exception) {
        //                                logger<NxCloudFixFileImpl>().error("Failed to execute git
        // apply", e)
        //                                -1
        //                            }
        //                        }
        //
        //                    if (exitCode == 0) {
        //                        showSuccessNotification(
        //                            "Nx Cloud fix applied locally. Please review and modify any
        // changes before committing."
        //                        )
        //
        //                        // Update the fix status
        //                        val cloudApiService = NxCloudApiService.getInstance(project)
        //                        val updateSuccess =
        //                            cloudApiService.updateSuggestedFix(aiFixId, "APPLIED_LOCALLY")
        //
        //                        if (!updateSuccess) {
        //                            logger<NxCloudFixFileImpl>()
        //                                .warn("Failed to update fix status in Nx Cloud")
        //                        }
        //
        //                        // Refresh CIPE data
        //                        CIPEPollingService.getInstance(project).forcePoll()
        //                    } else {
        //                        logger<NxCloudFixFileImpl>()
        //                            .error("Failed to apply patch: git apply exited with code
        // $exitCode")
        //                        showErrorNotification(
        //                            "Failed to apply Nx Cloud fix locally. Please check the IDE
        // logs for more details."
        //                        )
        //                    }
        //                } finally {
        //                    // Clean up temp file
        //                    withContext(Dispatchers.IO) { tempFile.delete() }
        //                }
        //            } catch (e: Exception) {
        //                logger<NxCloudFixFileImpl>().error("Failed to apply Nx Cloud fix locally",
        // e)
        //                showErrorNotification("Failed to apply Nx Cloud fix locally:
        // ${e.message}")
        //            }
        //        }
    }

    private fun handleReject() {
        logger<NxCloudFixFileImpl>().info("Reject action received")

        val fixDetails = currentFixDetails ?: return
        val aiFixId =
            fixDetails.runGroup.aiFix?.aiFixId
                ?: run {
                    showErrorNotification("No AI fix ID found")
                    return
                }

        cs.launch {
            try {
                val cloudApiService = NxCloudApiService.getInstance(project)
                val success = cloudApiService.updateSuggestedFix(aiFixId, "REJECTED")

                if (success) {
                    showSuccessNotification("Nx Cloud fix ignored")
                    // Refresh CIPE data
                    CIPEPollingService.getInstance(project).forcePoll()
                    // Close the AI fix editor
                    withContext(Dispatchers.EDT) {
                        FileEditorManager.getInstance(project).closeFile(this@NxCloudFixFileImpl)
                    }
                } else {
                    showErrorNotification("Failed to reject AI fix")
                }
            } catch (e: Exception) {
                logger<NxCloudFixFileImpl>().error("Failed to reject AI fix", e)
                showErrorNotification("Failed to reject AI fix: ${e.message}")
            }
        }
    }

    private fun handleShowDiff() {
        togglePreview()
    }

    // UI Helper Methods
    private fun showWithPreview() {
        if (!isShowingPreview) {
            splitter.firstComponent = browser.component
            splitter.secondComponent = diffContainer
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
        val toggleDiffAction =
            object :
                AnAction("Toggle Diff", "Toggle diff preview", AllIcons.Actions.Diff), DumbAware {
                override fun actionPerformed(e: AnActionEvent) {
                    togglePreview()
                }

                override fun update(e: AnActionEvent) {
                    e.presentation.icon =
                        if (isShowingPreview) AllIcons.Actions.PreviewDetails
                        else AllIcons.Actions.Diff
                }
            }

        val actionGroup = DefaultActionGroup(toggleDiffAction)
        val toolbar =
            ActionManager.getInstance()
                .createActionToolbar(ActionPlaces.EDITOR_TOOLBAR, actionGroup, true)
        toolbar.targetComponent = mainPanel
        return toolbar.component
    }

    private fun showSuccessNotification(message: String) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("Nx Cloud CIPE")
            .createNotification("", message, NotificationType.INFORMATION)
            .notify(project)
    }

    private fun showErrorNotification(message: String) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("Nx Cloud CIPE")
            .createNotification("", message, NotificationType.ERROR)
            .notify(project)
    }

    // Diff Preview Methods using IntelliJ's PatchReader and PatchDiffRequest
    private suspend fun updateDiff(gitDiffText: String?) {
        if (gitDiffText.isNullOrBlank()) {
            withContext(Dispatchers.EDT) { showDiffPlaceholder() }
            return
        }

        // Parse the git diff using IntelliJ's PatchReader
        val patches =
            try {
                logger<NxCloudFixFileImpl>().info("Parsing git diff, length: ${gitDiffText.length}")
                val patchReader = PatchReader(gitDiffText)
                val result = patchReader.readTextPatches()
                logger<NxCloudFixFileImpl>().info("Successfully parsed ${result.size} patches")
                result
            } catch (e: PatchSyntaxException) {
                logger<NxCloudFixFileImpl>().error("PatchSyntaxException: ${e.message}", e)
                withContext(Dispatchers.EDT) {
                    showDiffError("Failed to parse git diff: ${e.message}")
                }
                return
            } catch (e: Exception) {
                logger<NxCloudFixFileImpl>().error("Exception parsing diff: ${e.message}", e)
                withContext(Dispatchers.EDT) {
                    showDiffError("Failed to parse git diff: ${e.message}")
                }
                return
            }

        if (patches.isEmpty()) {
            withContext(Dispatchers.EDT) { showDiffPlaceholder() }
            return
        }

        displayDiff(patches)
    }

    private suspend fun displayDiff(patches: List<TextFilePatch>) {
        withContext(Dispatchers.EDT) {
            // Clear existing diff processor
            diffContainer.removeAll()
            diffProcessor?.let { Disposer.dispose(it) }
            diffProcessor = null

            try {
                logger<NxCloudFixFileImpl>()
                    .info("Creating diff viewer for ${patches.size} patches")

                // Build a SimpleDiffRequestChain from patches
                val requests: List<DiffRequest> =
                    patches.map { patch ->
                        logger<NxCloudFixFileImpl>()
                            .debug(
                                "Creating PatchDiffRequest for ${patch.afterName ?: patch.beforeName}"
                            )
                        PatchDiffRequest(patch)
                    }

                if (requests.isEmpty()) {
                    logger<NxCloudFixFileImpl>().warn("No diff requests created")
                    showDiffPlaceholder()
                    return@withContext
                }

                val chain = SimpleDiffRequestChain(requests)

                // Configure the diff viewer for read-only patch viewing
                chain.putUserData(DiffUserDataKeysEx.SHOW_READ_ONLY_LOCK, false)
                chain.putUserData(DiffUserDataKeys.DO_NOT_IGNORE_WHITESPACES, true)
                chain.putUserData(DiffUserDataKeysEx.SHOW_READ_ONLY_LOCK, false)
                //                chain.putUserData(DiffUserDataKeysEx.LEFT_TOOLBAR, null)

                // Create the chain processor
                val processor = CacheDiffRequestChainProcessor(project, chain)

                diffProcessor = processor

                // Add the processor component to the container
                diffContainer.add(processor.component, BorderLayout.CENTER)

                // Force the processor to update
                processor.updateRequest()

                logger<NxCloudFixFileImpl>().info("Diff viewer created successfully")
            } catch (e: Exception) {
                logger<NxCloudFixFileImpl>().error("Failed to create diff viewer", e)
                diffContainer.add(
                    createErrorPanel("Could not create diff viewer: ${e.message}"),
                    BorderLayout.CENTER
                )
            }

            diffContainer.revalidate()
            diffContainer.repaint()
        }
    }

    private fun createErrorPanel(message: String): JComponent {
        return JPanel(BorderLayout()).apply {
            preferredSize = Dimension(0, 100)
            background = UIUtil.getPanelBackground()
            border = JBUI.Borders.empty(16)

            add(
                JBLabel(message, AllIcons.General.Error, SwingConstants.CENTER),
                BorderLayout.CENTER
            )
        }
    }

    private fun showDiffPlaceholder() {
        diffContainer.removeAll()
        diffContainer.add(
            JBLabel("No diff to display", SwingConstants.CENTER).apply {
                foreground = UIUtil.getInactiveTextColor()
            },
            BorderLayout.CENTER
        )
        diffContainer.revalidate()
        diffContainer.repaint()
    }

    private fun showDiffError(message: String) {
        diffContainer.removeAll()
        diffContainer.add(
            JBLabel(message, AllIcons.General.Error, SwingConstants.CENTER),
            BorderLayout.CENTER
        )
        diffContainer.revalidate()
        diffContainer.repaint()
    }

    private fun extractIntellijStyles(): NxCloudFixStyles {
        val backgroundColor = getHexColor(UIUtil.getPanelBackground())
        val foregroundColor =
            getHexColor(
                if (!JBColor.isBright()) {
                    UIUtil.getActiveTextColor()
                } else {
                    UIUtil.getLabelForeground()
                }
            )
        val mutedForegroundColor = getHexColor(UIManager.getColor("Component.infoForeground"))
        val primaryColor = getHexColor(UIManager.getColor("Button.default.endBackground"))
        val errorColor = getHexColor(UIManager.getColor("Component.errorFocusColor"))
        val fieldBackgroundColor = getHexColor(UIManager.getColor("TextField.background"))
        val fieldBorderColor = getHexColor(UIManager.getColor("Component.borderColor"))
        val selectFieldBackgroundColor =
            getHexColor(UIManager.getColor("ComboBox.nonEditableBackground"))
        val activeSelectionBackgroundColor =
            getHexColor(UIManager.getColor("ComboBox.selectionBackground"))
        val focusBorderColor = getHexColor(UIManager.getColor("Component.focusColor"))
        val badgeBackgroundColor = selectFieldBackgroundColor
        val badgeForegroundColor = foregroundColor
        val bannerWarningBackgroundColor =
            getHexColor(UIManager.getColor("Component.warningFocusColor"))
        val bannerTextColor = getHexColor(UIManager.getColor("Button.foreground"))
        val separatorColor = getHexColor(UIManager.getColor("StatusBar.borderColor"))
        val fieldNavHoverColor = getHexColor(UIManager.getColor("TabbedPane.hoverColor"))
        val scrollbarThumbColor = selectFieldBackgroundColor

        // Cloud fix specific colors
        val successColor = getHexColor(UIManager.getColor("Actions.Green") ?: JBColor.GREEN)
        val warningColor = getHexColor(UIManager.getColor("Actions.Yellow") ?: JBColor.YELLOW)
        val hoverColor = getHexColor(UIManager.getColor("ActionButton.hoverBackground"))
        val borderColor = getHexColor(UIManager.getColor("Borders.color"))
        val secondaryColor = getHexColor(UIManager.getColor("Button.startBackground"))
        val secondaryForegroundColor = getHexColor(UIManager.getColor("Label.infoForeground"))

        val fontFamily =
            "'${UIUtil.getLabelFont().family}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans','Helvetica Neue', sans-serif"
        val fontSize = "${UIUtil.getLabelFont().size}px"

        return NxCloudFixStyles(
            backgroundColor = backgroundColor,
            foregroundColor = foregroundColor,
            mutedForegroundColor = mutedForegroundColor,
            primaryColor = primaryColor,
            errorColor = errorColor,
            fieldBackgroundColor = fieldBackgroundColor,
            fieldBorderColor = fieldBorderColor,
            selectFieldBackgroundColor = selectFieldBackgroundColor,
            activeSelectionBackgroundColor = activeSelectionBackgroundColor,
            focusBorderColor = focusBorderColor,
            badgeBackgroundColor = badgeBackgroundColor,
            badgeForegroundColor = badgeForegroundColor,
            bannerWarningBackgroundColor = bannerWarningBackgroundColor,
            bannerTextColor = bannerTextColor,
            separatorColor = separatorColor,
            fieldNavHoverColor = fieldNavHoverColor,
            scrollbarThumbColor = scrollbarThumbColor,
            fontFamily = fontFamily,
            fontSize = fontSize,
            successColor = successColor,
            warningColor = warningColor,
            hoverColor = hoverColor,
            borderColor = borderColor,
            secondaryColor = secondaryColor,
            secondaryForegroundColor = secondaryForegroundColor
        )
    }
}

@Service(Service.Level.PROJECT)
private class NxCloudFixFileCoroutineHolder(val cs: CoroutineScope) {
    companion object {
        fun getInstance(project: Project): NxCloudFixFileCoroutineHolder =
            project.getService(NxCloudFixFileCoroutineHolder::class.java)
    }
}
