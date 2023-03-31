package dev.nx.console.ui

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.project.Project
import dev.nx.console.NxConsoleBundle
import dev.nx.console.nxls.NxRefreshWorkspaceAction

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
    }
}
