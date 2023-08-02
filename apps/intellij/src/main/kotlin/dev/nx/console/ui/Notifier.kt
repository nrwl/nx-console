package dev.nx.console.ui

import com.intellij.ide.BrowserUtil
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
import dev.nx.console.utils.Throttler
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
                    NotificationType.ERROR
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
                    NotificationType.INFORMATION
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
                        }
                    )
                        as Collection<AnAction>
                )
                .notify(project)
        }

        fun notifyNoProject(project: Project, path: String?) {
            if (path == null) {
                this.notifyAnything(project, "Couldn't find project.", NotificationType.ERROR)
            } else {
                this.notifyAnything(
                    project,
                    "Couldn't find a project at $path. Are you sure this path belongs to an Nx project?",
                    NotificationType.ERROR
                )
            }
        }

        private val lspIssueExceptionThrottler =
            Throttler(1000L, CoroutineScope(Dispatchers.Default))
        fun notifyLspMessageIssueExceptionThrottled(project: Project, e: MessageIssueException) =
            lspIssueExceptionThrottler.throttle { notifyLSPMessageIssueException(project, e) }
        fun notifyLSPMessageIssueException(project: Project, e: MessageIssueException) {
            group
                .createNotification(
                    "<html>" +
                        "Nx Console ran into problems reading your workspace files: <br>" +
                        "<pre>${e.issues.first().cause.message}</pre><br>" +
                        "Make sure to double-check your project.json & nx.json files for syntax errors below." +
                        "</html>",
                    NotificationType.ERROR
                )
                .setTitle("Nx Console")
                .addAction(AnalyzeNxConfigurationFilesNotificationAction())
                .notify(project)
        }
        fun notifyAnything(
            project: Project,
            message: String,
            type: NotificationType = NotificationType.INFORMATION
        ) {
            group.createNotification(message, type).setTitle("Nx Console").notify(project)
        }
    }
}
