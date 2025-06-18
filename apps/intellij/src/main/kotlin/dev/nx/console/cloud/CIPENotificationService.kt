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

        val notification =
            NOTIFICATION_GROUP.createNotification(title = title, content = content, type = type)

        val assistantReady =
            hasAIAssistantInstalled() && project.service<McpServerService>().isMcpServerSetup()

        if (type == NotificationType.ERROR && assistantReady) {
            try {
                ActionManager.getInstance().getAction("dev.nx.console.llm.CIPEAutoFixAction")?.let {
                    notification.addAction(it)
                }
            } catch (e: Throwable) {
                //
            }
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
}
