package dev.nx.console.utils

// import dev.nx.console.ide.project_json_inspection.AnalyzeNxConfigurationFilesNotificationAction
import com.intellij.analysis.problemsView.toolWindow.ProblemsView
import com.intellij.ide.BrowserUtil
import com.intellij.ide.util.PropertiesComponent
import com.intellij.notification.*
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.util.ui.RestartDialogImpl
import dev.nx.console.NxConsoleBundle
import dev.nx.console.nxls.NxRefreshWorkspaceAction
import dev.nx.console.telemetry.actions.TelemetryOptInAction
import dev.nx.console.telemetry.actions.TelemetryOptOutAction
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import org.eclipse.lsp4j.jsonrpc.MessageIssueException

class Notifier {
    companion object {
        private fun getGroup(): NotificationGroup {
            return NotificationGroupManager.getInstance().getNotificationGroup("Nx Console")
        }

        fun notifyNxlsError(project: Project) {
            getGroup()
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
            getGroup()
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
            getGroup()
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
                //                .addAction(AnalyzeNxConfigurationFilesNotificationAction())
                .notify(project)
        }

        fun notifyJCEFNotEnabled(project: Project) {
            getGroup()
                .createNotification(
                    "Can't open the Generate UI - Your IDE doesn't support JCEF.",
                    NotificationType.ERROR,
                )
                .setTitle("Nx Console")
                .addAction(
                    NotificationAction.createSimpleExpiring("Learn more") {
                        BrowserUtil.browse("https://plugins.jetbrains.com/docs/intellij/jcef.html")
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
                getGroup()
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

        fun notifyNoGenerators(project: Project, hasNxErrors: Boolean) {
            val notification =
                getGroup()
                    .createNotification(
                        if (hasNxErrors) "No generators found. View Nx Errors for more information."
                        else "No generators found. View logs for more information.",
                        NotificationType.ERROR,
                    )
                    .setTitle("Nx Console")

            if (hasNxErrors) {
                notification.addAction(
                    NotificationAction.createSimpleExpiring("View Nx Errors") {
                        ProblemsView.getToolWindow(project)?.show()
                    }
                )
            } else {
                notification.addAction(ActionManager.getInstance().getAction("OpenLog"))
            }
            notification.notify(project)
        }

        fun notifyMCPSettingNeedsRefresh(project: Project) {
            getGroup()
                .createNotification(
                    "MCP server installed. Please restart the IDE to apply the setting and start the server.",
                    NotificationType.INFORMATION,
                )
                .setTitle("Nx Console")
                .addAction(
                    object : AnAction("Restart IDE"), DumbAware {
                        override fun actionPerformed(e: AnActionEvent) {
                            RestartDialogImpl.restartWithConfirmation()
                        }
                    }
                )
                .notify(project)
        }

        fun notifyAnything(
            project: Project,
            message: String,
            type: NotificationType = NotificationType.INFORMATION,
        ) {
            getGroup().createNotification(message, type).setTitle("Nx Console").notify(project)
        }

        fun notifyAiAssistantPluginRequired(project: Project) {
            getGroup()
                .createNotification(
                    "This action sets up the MCP server for the AI Assistant plugin. Install/Enable the AI Assistant plugin to proceed, or configure the MCP server manually for other tools.",
                    NotificationType.WARNING,
                )
                .setTitle("Nx Console")
                .addAction(
                    NotificationAction.createSimpleExpiring("Learn More") {
                        BrowserUtil.browse(
                            "https://nx.dev/getting-started/ai-integration#manual-setup-for-other-ai-clients"
                        )
                    }
                )
                .notify(project)
        }
    }
}
