package dev.nx.console.utils

import com.intellij.ide.BrowserUtil
import com.intellij.ide.util.PropertiesComponent
import com.intellij.notification.Notification
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project
import dev.nx.console.NxConsoleBundle
import dev.nx.console.ide.project_json_inspection.AnalyzeNxConfigurationFilesNotificationAction
import dev.nx.console.nxls.NxRefreshWorkspaceAction
import dev.nx.console.telemetry.actions.TelemetryOptInAction
import dev.nx.console.telemetry.actions.TelemetryOptOutAction
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import org.eclipse.lsp4j.jsonrpc.MessageIssueException

class Notifier {
    companion object {
        val group = NotificationGroupManager.getInstance().getNotificationGroup("Nx Console")

        fun notifyNxlsError(project: Project) {
            group
                .createNotification(
                    NxConsoleBundle.message("nxls.not.started"),
                    NotificationType.ERROR,
                )
                .setTitle("Nx Console")
                .setSuggestionType(true)
                .addAction(NxRefreshWorkspaceAction())
                .notify(project)
        }

        fun notifyTelemetry(project: Project) {
            group
                .createNotification(
                    NxConsoleBundle.message("nx.telemetry.permission"),
                    NotificationType.INFORMATION,
                )
                .setTitle("Nx Console")
                .addActions(
                    listOf(
                        TelemetryOptInAction(),
                        TelemetryOptOutAction(),
                        object : AnAction("Learn more") {
                            override fun actionPerformed(e: AnActionEvent) {
                                BrowserUtil.browse(
                                    "https://nx.dev/recipes/nx-console/console-telemetry#collected-data"
                                )
                            }
                        },
                    )
                        as Collection<AnAction>
                )
                .notify(project)
        }

        fun notifyNoProject(project: Project, path: String?) {
            if (path == null) {
                notifyAnything(project, "Couldn't find project.", NotificationType.ERROR)
            } else {
                notifyAnything(
                    project,
                    "Couldn't find a project at $path. Are you sure this path belongs to an Nx project?",
                    NotificationType.ERROR,
                )
            }
        }

        private val lspIssueExceptionThrottler =
            Throttler(1000L, CoroutineScope(Dispatchers.Default))

        fun notifyLspMessageIssueExceptionThrottled(
            project: Project,
            requestName: String,
            e: MessageIssueException,
        ) =
            lspIssueExceptionThrottler.throttle {
                notifyLSPMessageIssueException(project, requestName, e)
            }

        fun notifyLSPMessageIssueException(
            project: Project,
            requestName: String,
            e: MessageIssueException,
        ) {
            group
                .createNotification(
                    "<html>" +
                        "Nx Console ran into problems reading your workspace files during the following request:" +
                        "<br>" +
                        requestName +
                        "<br>" +
                        "<pre>${e.issues.first().cause.message}</pre><br>" +
                        "Make sure to double-check your project.json & nx.json files for syntax errors below." +
                        "</html>",
                    NotificationType.ERROR,
                )
                .setTitle("Nx Console")
                .addAction(AnalyzeNxConfigurationFilesNotificationAction())
                .notify(project)
        }

        fun notifyJCEFNotEnabled(project: Project) {
            group
                .createNotification(
                    "Can't open the Generate UI - Your IDE doesn't support JCEF.",
                    NotificationType.ERROR,
                )
                .setTitle("Nx Console")
                .addAction(
                    object : NotificationAction("Learn more") {
                        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
                            BrowserUtil.browse(
                                "https://plugins.jetbrains.com/docs/intellij/jcef.html"
                            )
                            notification.expire()
                        }
                    }
                )
                .notify(project)
        }

        fun notifyNxRefresh(project: Project): Notification? {
            val hideNotificationPropertyKey = "dev.nx.console.hide_nx_refresh_notification"

            val shouldHideNotification =
                PropertiesComponent.getInstance(project).getBoolean(hideNotificationPropertyKey)

            if (shouldHideNotification) {
                return null
            }

            val notification =
                group
                    .createNotification(
                        "Refreshing Nx Workspace. You can check the progress in the status bar.",
                        NotificationType.INFORMATION,
                    )
                    .setTitle("Nx Console")

            notification.addActions(
                setOf(
                    NotificationAction.createSimpleExpiring("OK") { notification.expire() },
                    NotificationAction.createSimpleExpiring("Don't show again") {
                        notification.expire()
                        PropertiesComponent.getInstance(project)
                            .setValue(hideNotificationPropertyKey, true)
                    },
                )
            )

            notification.notify(project)

            return notification
        }

        fun notifyAnything(
            project: Project,
            message: String,
            type: NotificationType = NotificationType.INFORMATION,
        ) {
            group.createNotification(message, type).setTitle("Nx Console").notify(project)
        }
    }
}
