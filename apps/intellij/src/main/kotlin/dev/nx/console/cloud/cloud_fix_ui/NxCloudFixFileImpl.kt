package dev.nx.console.cloud.cloud_fix_ui

import com.intellij.diff.chains.SimpleDiffRequestChain
import com.intellij.diff.impl.CacheDiffRequestChainProcessor
import com.intellij.diff.requests.DiffRequest
import com.intellij.diff.util.DiffUserDataKeys
import com.intellij.diff.util.DiffUserDataKeysEx
import com.intellij.icons.AllIcons
import com.intellij.ide.browsers.BrowserLauncher
import com.intellij.ide.ui.UISettingsListener
import com.intellij.notification.Notification
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.Disposable
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diff.impl.patch.FilePatch
import com.intellij.openapi.diff.impl.patch.PatchReader
import com.intellij.openapi.diff.impl.patch.PatchSyntaxException
import com.intellij.openapi.diff.impl.patch.TextFilePatch
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.util.ThrowableComputable
import com.intellij.openapi.vcs.changes.LocalChangeList
import com.intellij.openapi.vcs.changes.patch.*
import com.intellij.openapi.vcs.changes.patch.tool.PatchDiffRequest
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.LightVirtualFile
import com.intellij.ui.JBColor
import com.intellij.ui.JBSplitter
import com.intellij.ui.components.JBLabel
import com.intellij.ui.jcef.*
import com.intellij.util.containers.MultiMap
import com.intellij.util.messages.MessageBusConnection
import com.intellij.util.ui.JBUI
import com.intellij.util.ui.UIUtil
import dev.nx.console.cloud.CIPEPollingService
import dev.nx.console.cloud.NxCloudApiService
import dev.nx.console.models.AITaskFixUserAction
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.FetchAndPullChangesAction
import dev.nx.console.utils.GitUtils
import dev.nx.console.utils.executeJavascriptWithCatch
import dev.nx.console.utils.jcef.OpenDevToolsContextMenuHandler
import dev.nx.console.utils.jcef.awaitLoad
import dev.nx.console.utils.jcef.getHexColor
import java.awt.*
import java.net.URI
import javax.swing.*
import javax.swing.UIManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
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
    val successColor: String,
    val warningColor: String,
    val hoverColor: String,
    val borderColor: String,
    val secondaryColor: String,
    val secondaryForegroundColor: String,
)

class NxCloudFixFileImpl(
    name: String,
    private val project: Project,
    private val disposedCallback: (file: NxCloudFixFileImpl) -> Unit,
) : NxCloudFixFile(name) {

    private val cs = NxCloudFixFileCoroutineHolder.getInstance(project).cs
    private var currentFixDetails: NxCloudFixDetails? = null
    private var messageBusConnection: MessageBusConnection? = null

    private val mainPanel = JPanel(BorderLayout())
    private val splitter =
        JBSplitter(false, "NX_CONSOLE.CLOUD_FIX_SPLITTER", 0.6f) // 60% webview, 40% diff
    private val diffContainer = JPanel(BorderLayout())
    private var diffProcessor: CacheDiffRequestChainProcessor? = null
    private var isShowingPreview = false
    private var currentDiff: String? = null

    init {
        diffContainer.background = UIUtil.getPanelBackground()
        showDiffPlaceholder()
    }

    override fun createMainComponent(project: Project): JComponent {
        browser.jbCefClient.setProperty(JBCefClient.Properties.JS_QUERY_POOL_SIZE, 100)
        browser.setPageBackgroundColor(getHexColor(UIUtil.getPanelBackground()))
        browser.jbCefClient.addContextMenuHandler(
            OpenDevToolsContextMenuHandler(),
            browser.cefBrowser,
        )

        mainPanel.add(splitter, BorderLayout.CENTER)

        showWebviewOnly()

        registerThemeChangeListener()

        val disposable = Disposable {
            messageBusConnection?.disconnect()
            messageBusConnection = null
            disposedCallback(this)
        }

        Disposer.register(browser, disposable)

        return mainPanel
    }

    override fun showFixDetails(details: NxCloudFixDetails) {
        // Test serialization first to catch any issues early
        try {
            json.encodeToString(details)
        } catch (e: Exception) {
            logger<NxCloudFixFileImpl>().error("Failed to serialize fix details", e)

            NotificationGroupManager.getInstance()
                .getNotificationGroup("Nx Cloud CIPE")
                .createNotification(
                    "Failed to Load AI Fix",
                    "Could not parse AI fix data: ${e.message}",
                    NotificationType.ERROR,
                )
                .notify(project)

            return
        }

        currentFixDetails =
            details.copy(hasUncommittedChanges = GitUtils.hasUncommittedChanges(project))
        cs.launch {
            loadHtmlWithInitialData(currentFixDetails!!)
            updateDiffPreview(details.runGroup.aiFix?.suggestedFix)
        }
    }

    fun updateDiffPreview(gitDiff: String?) {
        currentDiff = gitDiff
        cs.launch { updateDiff(gitDiff) }

        if (gitDiff != null && gitDiff.isNotBlank() && !isShowingPreview) {
            showWithPreview()
        }
    }

    private suspend fun loadHtmlWithInitialData(details: NxCloudFixDetails) {
        val detailsString = json.encodeToString(details)

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
                        color: ${getHexColor(if (!JBColor.isBright()) UIUtil.getActiveTextColor() else UIUtil.getLabelForeground())};
                    }
                </style>
            </head>
            <body>
                <script>
                    // Set initial data before any scripts load
                    globalThis.fixDetails = $detailsString;
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
            updateWebviewStyles()
        }
    }

    private fun registerThemeChangeListener() {
        messageBusConnection = ApplicationManager.getApplication().messageBus.connect()
        messageBusConnection?.subscribe(
            UISettingsListener.TOPIC,
            UISettingsListener { updateWebviewStyles() },
        )
    }

    private fun updateWebviewStyles() {
        cs.launch {
            browser.setPageBackgroundColor(getHexColor(UIUtil.getPanelBackground()))

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
            val cleanMessage =
                if (message.startsWith("\"") && message.endsWith("\"")) {
                    message.substring(1, message.length - 1).replace("\\\"", "\"")
                } else {
                    message
                }
            val parsed = json.decodeFromString<NxCloudFixMessage>(cleanMessage)
            logger.info("Received message from webview: $parsed")

            when (parsed) {
                is NxCloudFixMessage.Apply -> handleApply(parsed.commitMessage)
                is NxCloudFixMessage.ApplyLocally -> handleApplyLocally()
                is NxCloudFixMessage.Reject -> handleReject()
                is NxCloudFixMessage.ShowDiff -> handleShowDiff()
                is NxCloudFixMessage.OpenExternalLink -> handleOpenExternalLink(parsed)
            }
        } catch (e: Exception) {
            logger.error("Failed to parse message from webview", e)
        }
    }

    fun sendFixDetailsToWebview(details: NxCloudFixDetails) {
        if (browser.isDisposed) {
            return
        }

        logger<NxCloudFixFileImpl>().info("Sending fix details to webview")

        val hasUncommittedChanges = GitUtils.hasUncommittedChanges(project)
        val updatedDetails = details.copy(hasUncommittedChanges = hasUncommittedChanges)

        val mockDetails = json.encodeToString(updatedDetails)

        this.currentFixDetails = updatedDetails
        val js =
            """
            window.intellijApi.postToWebview({
                type: 'update-details',
                details: $mockDetails
            })
        """

        cs.launch {
            if (!browser.isDisposed) {
                browser.executeJavascriptWithCatch(js)
            }
        }
    }

    fun updateUncommittedChangesFlag() {
        if (browser.isDisposed) {
            return
        }
        val details = currentFixDetails
        if (details != null) {
            val updatedDetails =
                details.copy(hasUncommittedChanges = GitUtils.hasUncommittedChanges(project))
            currentFixDetails = updatedDetails
            sendFixDetailsToWebview(updatedDetails)
        }
    }

    private fun handleApply(commitMessage: String? = null) {
        logger<NxCloudFixFileImpl>()
            .info("Apply action received with commit message: $commitMessage")

        TelemetryService.getInstance(project).featureUsed(TelemetryEvent.CLOUD_APPLY_AI_FIX)

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
                val success =
                    cloudApiService.updateSuggestedFix(
                        aiFixId,
                        AITaskFixUserAction.APPLIED,
                        commitMessage,
                    )

                if (success) {
                    val targetBranch = fixDetails.cipe.branch
                    val hasBranchOnRemote =
                        GitUtils.checkBranchExistsOnRemote(project, targetBranch)

                    if (!hasBranchOnRemote) {
                        showSuccessNotification(
                            "Nx Cloud fix applied successfully. Don't forget to integrate the changes into your local branch"
                        )
                    } else {
                        val notification =
                            NotificationGroupManager.getInstance()
                                .getNotificationGroup("Nx Cloud CIPE")
                                .createNotification(
                                    "Nx Cloud fix applied successfully.",
                                    NotificationType.INFORMATION,
                                )
                        notification.addAction(
                          FetchAndPullChangesAction(targetBranch)
                        )
                        notification.notify(project)
                    }

                    CIPEPollingService.getInstance(project).forcePoll()

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

        TelemetryService.getInstance(project).featureUsed(TelemetryEvent.CLOUD_APPLY_AI_FIX_LOCALLY)

        val fixDetails = currentFixDetails ?: return
        val suggestedFix = fixDetails.runGroup.aiFix?.suggestedFix ?: return

        val currentBranch = GitUtils.getCurrentBranch(project)
        val cipeBranch = fixDetails.cipe.branch

        if (currentBranch != null && currentBranch != cipeBranch) {
            ApplicationManager.getApplication().invokeLater {
                val result =
                    Messages.showYesNoDialog(
                        project,
                        "Your local branch '$currentBranch' does not match the branch '$cipeBranch' of the CI pipeline execution.",
                        "Are you sure you want to apply the fix locally?",
                        Messages.getWarningIcon(),
                    )
                if (result == Messages.YES) {
                    applyPatchLocally(suggestedFix)
                }
            }
        } else {
            applyPatchLocally(suggestedFix)
        }
    }

    private fun applyPatchLocally(suggestedFix: String) {
        val patchFile = LightVirtualFile("nx-cloud-fix", PatchFileType.INSTANCE, suggestedFix)
        ApplicationManager.getApplication().invokeLater {
            val executor =
                object : ApplyPatchDefaultExecutor(project) {
                    override fun apply(
                        remaining: MutableList<out FilePatch>,
                        patchGroupsToApply: MultiMap<VirtualFile, AbstractFilePatchInProgress<*>>,
                        localList: LocalChangeList?,
                        fileName: String?,
                        additionalInfo:
                            ThrowableComputable<
                                MutableMap<String, MutableMap<String, CharSequence>>,
                                PatchSyntaxException,
                            >?,
                    ) {
                        try {
                            logger<NxCloudFixFileImpl>().info("applying fix locally")
                            super.apply(
                                remaining,
                                patchGroupsToApply,
                                localList,
                                fileName,
                                additionalInfo,
                            )
                            logger<NxCloudFixFileImpl>().info("sending message to api")

                            val fixDetails = currentFixDetails ?: return
                            val aiFixId =
                                fixDetails.runGroup.aiFix?.aiFixId
                                    ?: run {
                                        showErrorNotification("No AI fix ID found")
                                        return
                                    }

                            cs.launch {
                                try {
                                    logger<NxCloudFixFileImpl>()
                                        .info("actually doing send message to api")

                                    val cloudApiService = NxCloudApiService.getInstance(project)
                                    val success =
                                        cloudApiService.updateSuggestedFix(
                                            aiFixId,
                                            AITaskFixUserAction.APPLIED_LOCALLY,
                                        )

                                    if (success) {
                                        val targetBranch = fixDetails.cipe.branch
                                        val hasBranchOnRemote =
                                            GitUtils.checkBranchExistsOnRemote(
                                                project,
                                                targetBranch,
                                            )

                                        if (!hasBranchOnRemote) {
                                            showSuccessNotification(
                                                "Nx Cloud applied locally. Don't forget to integrate the changes into your local branch"
                                            )
                                        } else {
                                            val notification =
                                                NotificationGroupManager.getInstance()
                                                    .getNotificationGroup("Nx Cloud CIPE")
                                                    .createNotification(
                                                        "Nx Cloud applied locally.",
                                                        NotificationType.INFORMATION,
                                                    )
                                            notification.addAction(
                                                object :
                                                    com.intellij.notification.NotificationAction(
                                                        "Fetch & Pull Changes"
                                                    ) {
                                                    override fun actionPerformed(
                                                        e:
                                                            com.intellij.openapi.actionSystem.AnActionEvent,
                                                        notification:
                                                            com.intellij.notification.Notification,
                                                    ) {
                                                        GitUtils.fetchAndPullChanges(
                                                            project,
                                                            targetBranch,
                                                        )
                                                        notification.expire()
                                                    }
                                                }
                                            )
                                            notification.notify(project)
                                        }
                                        // Refresh CIPE data
                                        CIPEPollingService.getInstance(project).forcePoll()
                                        // Close the AI fix editor
                                        withContext(Dispatchers.EDT) {
                                            FileEditorManager.getInstance(project)
                                                .closeFile(this@NxCloudFixFileImpl)
                                        }
                                    }
                                } catch (e: Exception) {
                                    logger<NxCloudFixFileImpl>()
                                        .error("Failed to apply AI fix locally", e)
                                }
                            }
                        } catch (e: Throwable) {
                            logger<NxCloudFixFileImpl>().error("Failed to apply AI fix locally", e)
                        }
                    }
                }
            ApplyPatchDifferentiatedDialog(
                    project,
                    executor,
                    listOf(),
                    ApplyPatchMode.APPLY,
                    patchFile,
                )
                .show()
        }
    }

    private fun handleReject() {
        logger<NxCloudFixFileImpl>().info("Reject action received")

        TelemetryService.getInstance(project).featureUsed(TelemetryEvent.CLOUD_REJECT_AI_FIX)

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
                val success =
                    cloudApiService.updateSuggestedFix(aiFixId, AITaskFixUserAction.REJECTED)

                if (success) {
                    CIPEPollingService.getInstance(project).forcePoll()
                    withContext(Dispatchers.EDT) {
                        FileEditorManager.getInstance(project).closeFile(this@NxCloudFixFileImpl)
                    }
                } else {
                    logger<NxCloudFixFileImpl>().error("Failed to reject AI fix")
                }
            } catch (e: Exception) {
                logger<NxCloudFixFileImpl>().error("Failed to reject AI fix", e)
            }
        }
    }

    private fun handleShowDiff() {
        togglePreview()
    }

    private fun handleOpenExternalLink(message: NxCloudFixMessage.OpenExternalLink) {
        BrowserLauncher.instance.browse(URI.create(message.url))
    }

    private fun showWithPreview() {
        if (!isShowingPreview) {
            ApplicationManager.getApplication().invokeLater {
                splitter.firstComponent = browser.component
                splitter.secondComponent = diffContainer
                splitter.isShowDividerControls = true
                splitter.isShowDividerIcon = true
                isShowingPreview = true
            }
        }
    }

    private fun showWebviewOnly() {
        ApplicationManager.getApplication().invokeLater {
            splitter.firstComponent = browser.component
            splitter.secondComponent = null
            isShowingPreview = false
        }
    }

    private fun togglePreview() {
        if (isShowingPreview) {
            showWebviewOnly()
        } else {
            showWithPreview()
        }
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

    private suspend fun updateDiff(gitDiffText: String?) {
        if (gitDiffText.isNullOrBlank()) {
            withContext(Dispatchers.EDT) { showDiffPlaceholder() }
            return
        }

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
            diffContainer.removeAll()
            diffProcessor?.let { Disposer.dispose(it) }
            diffProcessor = null

            try {
                logger<NxCloudFixFileImpl>()
                    .info("Creating diff viewer for ${patches.size} patches")

                val requests: List<DiffRequest> =
                    patches.map { patch ->
                        logger<NxCloudFixFileImpl>()
                            .debug(
                                "Creating PatchDiffRequest for ${patch.afterName ?: patch.beforeName}"
                            )
                        PatchDiffRequest(patch, patch.beforeFileName, patch.beforeFileName, null)
                    }

                if (requests.isEmpty()) {
                    logger<NxCloudFixFileImpl>().warn("No diff requests created")
                    showDiffPlaceholder()
                    return@withContext
                }

                val chain = SimpleDiffRequestChain(requests)

                chain.putUserData(DiffUserDataKeysEx.SHOW_READ_ONLY_LOCK, false)
                chain.putUserData(DiffUserDataKeys.DO_NOT_IGNORE_WHITESPACES, true)

                val processor = CacheDiffRequestChainProcessor(project, chain)

                diffProcessor = processor

                diffContainer.add(processor.component, BorderLayout.CENTER)

                processor.updateRequest()

                logger<NxCloudFixFileImpl>().info("Diff viewer created successfully")
            } catch (e: Exception) {
                logger<NxCloudFixFileImpl>().error("Failed to create diff viewer", e)
                diffContainer.add(
                    createErrorPanel("Could not create diff viewer: ${e.message}"),
                    BorderLayout.CENTER,
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
                BorderLayout.CENTER,
            )
        }
    }

    private fun showDiffPlaceholder() {
        diffContainer.removeAll()
        diffContainer.add(
            JBLabel("No diff to display", SwingConstants.CENTER).apply {
                foreground = UIUtil.getInactiveTextColor()
            },
            BorderLayout.CENTER,
        )
        diffContainer.revalidate()
        diffContainer.repaint()
    }

    private fun showDiffError(message: String) {
        diffContainer.removeAll()
        diffContainer.add(
            JBLabel(message, AllIcons.General.Error, SwingConstants.CENTER),
            BorderLayout.CENTER,
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
            secondaryForegroundColor = secondaryForegroundColor,
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
