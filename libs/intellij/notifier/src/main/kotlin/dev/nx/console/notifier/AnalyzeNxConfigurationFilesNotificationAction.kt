package dev.nx.console.notifier

import com.intellij.notification.Notification
import com.intellij.notification.NotificationAction
import com.intellij.openapi.actionSystem.AnActionEvent

class AnalyzeNxConfigurationFilesNotificationAction :
    NotificationAction("Analyze configuration files") {
    override fun actionPerformed(e: AnActionEvent, notification: Notification) {
        val project = e.project ?: return
        notification.expire()
        checkForCodeSmells(project)
    }
}
