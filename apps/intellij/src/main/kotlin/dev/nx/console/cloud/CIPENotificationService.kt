package dev.nx.console.cloud

import com.intellij.ide.BrowserUtil
import com.intellij.notification.*
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import dev.nx.console.mcp.McpServerService
import dev.nx.console.mcp.hasAIAssistantInstalled
import dev.nx.console.models.CIPEInfo
import dev.nx.console.models.CIPERun
import dev.nx.console.models.CIPERunGroup
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.settings.options.NxCloudNotificationsLevel
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService

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
            is CIPENotificationEvent.AiFixAvailable ->
                showAiFixNotification(event.cipe, event.runGroup)
        }
    }

    private fun showCIPEFailedNotification(cipe: CIPEInfo) {
        showNotification(
            title = "CI Pipeline Failed",
            content = "CI Pipeline Execution for #${cipe.branch} has failed",
            type = NotificationType.ERROR,
            cipe = cipe,
            commitUrl = cipe.commitUrl
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
            cipe = cipe,
            commitUrl = cipe.commitUrl,
            resultsUrl = run.runUrl
        )
    }

    private fun showCIPESucceededNotification(cipe: CIPEInfo) {
        showNotification(
            title = "CI Pipeline Succeeded",
            content = "CI Pipeline Execution for #${cipe.branch} has completed",
            type = NotificationType.INFORMATION,
            cipe = cipe,
            commitUrl = cipe.commitUrl
        )
    }

    private fun showAiFixNotification(cipe: CIPEInfo, runGroup: CIPERunGroup) {
        telemetryService.featureUsed(TelemetryEvent.CLOUD_SHOW_AI_FIX_NOTIFICATION)

        val taskDisplay = runGroup.aiFix?.taskIds?.firstOrNull() ?: "task"
        val notification =
            NOTIFICATION_GROUP.createNotification(
                title = "AI Fix Available",
                content = "Nx Cloud suggested a fix for $taskDisplay in #${cipe.branch}",
                type = NotificationType.INFORMATION
            )

        notification.addAction(
            ShowSuggestedFixAction(cipe.ciPipelineExecutionId, runGroup.runGroup)
        )
        notification.addAction(RejectAiFixAction(cipe, runGroup))

        notification.notify(project)
    }

    private fun showNotification(
        title: String,
        content: String,
        type: NotificationType,
        cipe: CIPEInfo,
        commitUrl: String? = null,
        resultsUrl: String? = null
    ) {
        telemetryService.featureUsed(TelemetryEvent.CLOUD_SHOW_CIPE_NOTIFICATION)

        val notification =
            NOTIFICATION_GROUP.createNotification(title = title, content = content, type = type)

        if (type == NotificationType.ERROR) {
            // Check if any run group has an AI fix
            val runGroupWithFix = cipe.runGroups.find { it.aiFix != null }

            if (runGroupWithFix != null) {
                // Self-healing AI fix available - show AI fix action
                notification.addAction(
                    ViewAiFixAction(cipe.ciPipelineExecutionId, runGroupWithFix.runGroup)
                )
            } else {
                // No self-healing AI fix - show generic help action
                notification.addAction(HelpMeFixErrorAction())
            }
        }

        if (commitUrl != null) {
            notification.addAction(ViewCommitAction(commitUrl))
        }

        notification.addAction(ViewResultsAction(resultsUrl ?: cipe.cipeUrl))

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

    private inner class ViewAiFixAction(
        private val cipeId: String,
        private val runGroupId: String
    ) : NotificationAction("View AI Fix") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            // Will open AI fix webview (implement in later commit)
            telemetryService.featureUsed(TelemetryEvent.CLOUD_OPEN_FIX_DETAILS)
            notification.expire()
        }
    }

    private inner class ShowSuggestedFixAction(
        private val cipeId: String,
        private val runGroupId: String
    ) : NotificationAction("Show Suggested Fix") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            // Will open AI fix webview (implement in later commit)
            telemetryService.featureUsed(
                TelemetryEvent.CLOUD_SHOW_AI_FIX,
                mapOf("source" to TelemetryEventSource.NOTIFICATION)
            )
            notification.expire()
        }
    }

    private inner class RejectAiFixAction(
        private val cipe: CIPEInfo,
        private val runGroup: CIPERunGroup
    ) : NotificationAction("Reject") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            // Will implement AI fix rejection (implement in later commit)
            telemetryService.featureUsed(
                TelemetryEvent.CLOUD_REJECT_AI_FIX,
                mapOf("source" to TelemetryEventSource.NOTIFICATION)
            )
            notification.expire()
        }
    }

    private inner class HelpMeFixErrorAction : NotificationAction("Help me fix this error") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            telemetryService.featureUsed(
                TelemetryEvent.CLOUD_FIX_CIPE_ERROR,
                mapOf("source" to TelemetryEventSource.NOTIFICATION)
            )

            // Try to execute the existing AI assistant action if available
            val assistantReady =
                hasAIAssistantInstalled() && project.service<McpServerService>().isMcpServerSetup()

            if (assistantReady) {
                try {
                    ActionManager.getInstance()
                        .getAction("dev.nx.console.llm.CIPEAutoFixAction")
                        ?.actionPerformed(e)
                } catch (e: Throwable) {
                    // Fallback: could show a message about setting up AI assistant
                }
            }

            notification.expire()
        }
    }
}
