package dev.nx.console.telemetry.actions

import com.intellij.notification.Notification
import com.intellij.notification.NotificationAction
import com.intellij.openapi.actionSystem.AnActionEvent
import dev.nx.console.settings.NxConsoleSettingsProvider

class TelemetryOptOutAction : NotificationAction("Opt Out") {
    override fun actionPerformed(e: AnActionEvent, notification: Notification) {
        NxConsoleSettingsProvider.getInstance().apply {
            promptedForTelemetry = true
            enableTelemetry = false
        }

        notification.expire()
    }
}
