package dev.nx.console.cloud

import com.intellij.ide.BrowserUtil
import com.intellij.notification.*
import com.intellij.openapi.actionSystem.AnActionEvent
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

    private val logger = thisLogger()
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
            showHelp = true,
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
            showHelp = true,
        )
    }

    private fun showCIPESucceededNotification(cipe: CIPEInfo) {
        showNotification(
            title = "CI Pipeline Succeeded",
            content = "CI Pipeline Execution for #${cipe.branch} has completed",
            type = NotificationType.INFORMATION,
            cipeUrl = cipe.cipeUrl,
            commitUrl = cipe.commitUrl,
            showHelp = false,
        )
    }

    private fun showNotification(
        title: String,
        content: String,
        type: NotificationType,
        cipeUrl: String,
        commitUrl: String?,
        showHelp: Boolean,
    ) {
        telemetryService.featureUsed(TelemetryEvent.CLOUD_SHOW_CIPE_NOTIFICATION)

        val notification =
            NOTIFICATION_GROUP.createNotification(title = title, content = content, type = type)

        // Add actions in order: Help (if error), View Commit (if available), View Results
        // TODO: Implement help action later
        // if (showHelp && type == NotificationType.ERROR) {
        //     notification.addAction(HelpMeFixErrorAction())
        // }

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

    // TODO: Implement help action later
    // private inner class HelpMeFixErrorAction : NotificationAction("Help me fix this error") {
    //     override fun actionPerformed(e: AnActionEvent, notification: Notification) {
    //         telemetryService.featureUsed(
    //             TelemetryEvent.CLOUD_FIX_CIPE_ERROR,
    //             mapOf("source" to TelemetryEventSource.NOTIFICATION),
    //         )
    //         // TODO: Integrate with AI assistance when available
    //         logger.info("Help me fix error action triggered")
    //         notification.expire()
    //     }
    // }
}
