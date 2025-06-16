package dev.nx.console.cloud

import com.intellij.ide.BrowserUtil
import com.intellij.ml.llm.core.chat.session.*
import com.intellij.ml.llm.core.chat.ui.AIAssistantUIUtil
import com.intellij.ml.llm.privacy.trustedStringBuilders.privacyConst
import com.intellij.notification.*
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import dev.nx.console.models.CIPEInfo
import dev.nx.console.models.CIPERun
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.settings.options.NxCloudNotificationsLevel
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Service responsible for showing CIPE notifications. Simply displays notification events emitted
 * by CIPEDataSyncService.
 */
@Service(Service.Level.PROJECT)
class CIPENotificationService(private val project: Project) : CIPENotificationListener {

    companion object {
        private const val NOTIFICATION_GROUP_ID = "Nx Cloud CIPE"
        private val NOTIFICATION_GROUP =
            NotificationGroupManager.getInstance().getNotificationGroup(NOTIFICATION_GROUP_ID)

        fun getInstance(project: Project): CIPENotificationService =
            project.getService(CIPENotificationService::class.java)
    }

    private val telemetryService = TelemetryService.getInstance(project)

    override fun onNotificationEvent(event: CIPENotificationEvent) {
        val notificationSetting = getCIPENotificationSetting()

        // Check settings before showing any notification
        if (notificationSetting == NxCloudNotificationsLevel.NONE) {
            return
        }

        // For success notifications, only show if settings allow
        if (
            event is CIPENotificationEvent.CIPESucceeded &&
                notificationSetting != NxCloudNotificationsLevel.ALL
        ) {
            return
        }

        // Show the appropriate notification
        when (event) {
            is CIPENotificationEvent.CIPEFailed -> showCIPEFailedNotification(event.cipe)
            is CIPENotificationEvent.RunFailed -> showRunFailedNotification(event.cipe, event.run)
            is CIPENotificationEvent.CIPESucceeded -> showCIPESucceededNotification(event.cipe)
        }
    }

    private fun showCIPEFailedNotification(cipe: CIPEInfo) {
        showNotification(
            title = "CI Pipeline Failed",
            content = "CI Pipeline Execution for #${cipe.branch} has completed",
            type = NotificationType.ERROR,
            cipeUrl = cipe.cipeUrl,
            commitUrl = cipe.commitUrl,
        )
    }

    private fun showRunFailedNotification(cipe: CIPEInfo, run: CIPERun) {
        val command =
            if (run.command.length > 70) {
                run.command.substring(0, 60) + "[...]"
            } else {
                run.command
            }

        showNotification(
            title = "Run Failed",
            content = "\"$command\" has failed on #${cipe.branch}",
            type = NotificationType.ERROR,
            cipeUrl = run.runUrl,
            commitUrl = cipe.commitUrl,
        )
    }

    private fun showCIPESucceededNotification(cipe: CIPEInfo) {
        showNotification(
            title = "CI Pipeline Succeeded",
            content = "CI Pipeline Execution for #${cipe.branch} has completed",
            type = NotificationType.INFORMATION,
            cipeUrl = cipe.cipeUrl,
            commitUrl = cipe.commitUrl,
        )
    }

    private fun showNotification(
        title: String,
        content: String,
        type: NotificationType,
        cipeUrl: String,
        commitUrl: String?,
    ) {
        telemetryService.featureUsed(TelemetryEvent.CLOUD_SHOW_CIPE_NOTIFICATION)

        val notification = NOTIFICATION_GROUP.createNotification(title = title, content = content, type = type)

        // Add actions in order: Help (if error), View Commit (if available), View Results
        if (type == NotificationType.ERROR) {
            notification.addAction(CIPEAutoFixAction(project))
        }

        if (commitUrl != null) {
            notification.addAction(ViewCommitAction(commitUrl))
        }

        notification.addAction(ViewResultsAction(cipeUrl))

        notification.notify(project)
    }

    private fun getCIPENotificationSetting(): NxCloudNotificationsLevel {
        return NxConsoleSettingsProvider.getInstance().nxCloudNotifications
    }

    // Notification Actions

    private inner class ViewResultsAction(private val url: String) :
        NotificationAction("View Results") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            telemetryService.featureUsed(
                TelemetryEvent.CLOUD_VIEW_CIPE,
                mapOf("source" to TelemetryEventSource.NOTIFICATION),
            )
            BrowserUtil.browse(url)
            notification.expire()
        }
    }

    private inner class ViewCommitAction(private val url: String) :
        NotificationAction("View Commit") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            telemetryService.featureUsed(
                TelemetryEvent.CLOUD_VIEW_CIPE_COMMIT,
                mapOf("source" to TelemetryEventSource.NOTIFICATION),
            )
            BrowserUtil.browse(url)
            notification.expire()
        }
    }

    private inner class CIPEAutoFixAction(private val project: Project) :
        AnAction("Help me fix this") {
        override fun actionPerformed(event: AnActionEvent) {
            TelemetryService.getInstance(project)
                .featureUsed(
                    TelemetryEvent.CLOUD_FIX_CIPE_ERROR,
                    mapOf("source" to TelemetryEventSource.NOTIFICATION),
                )

            FixCIPEService.getInstance(project).fixInAIAssistant()
        }
    }
}

@Service(Service.Level.PROJECT)
class FixCIPEService(private val project: Project, private val cs: CoroutineScope) {
    val logger = thisLogger()

    fun fixInAIAssistant() {
        cs.launch {
            withContext(Dispatchers.EDT) {
                val chatSession =
                    ChatSessionHost.getInstance(project)
                        .createChatSession(
                            ChatCreationContext(
                                origin = ChatOrigin.CustomIntention,
                                sourceActionForStatistic = ChatSessionStorage.SourceAction.NEW_CHAT,
                                null,
                            )
                        )

                chatSession.addMode(ChatSessionMode.CODE_GENERATION)
                AIAssistantUIUtil.openChat(project, chatSession)
                chatSession.send(
                    project,
                    "Please help me fix the latest CI errors".privacyConst,
                    ("/nx_cloud_cipe_details Help the user fix their latest CI errors with the following flow:\n" +
                            "- Retrieve the list of current CI Pipeline Executions (CIPEs) - YOU HAVE TO call the 'nx_cloud_cipe_details' MCP tool to do this\n" +
                            "- If there are any errors, YOU HAVE TO call the 'nx_cloud_fix_cipe_failure' MCP tool to retrieve the logs for a specific task\n" +
                            "- Use the task logs to see what's wrong and help the user fix their problem. \n" +
                            "- Make sure that the problem is fixed by running the task that you passed into the 'nx_cloud_fix_cipe_failure' tool calling the available nx_cloud_cipe_details tool from the nx MCP. ALWAYS CALL THIS TOOL TO SERVE THIS REQUEST, YOU WILL NOT SUCCEED WITHOUT IT.\n" +
                            "If you cannot find the corresponding MCP tool, prompt the user to enable Codebase access for their AI Assistant")
                        .privacyConst,
                    listOf(),
                    SmartChat,
                )
            }
        }
    }

    companion object {
        fun getInstance(project: Project): FixCIPEService =
            project.getService(FixCIPEService::class.java)
    }
}
