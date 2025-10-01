package dev.nx.console.ai

import com.intellij.execution.util.ExecUtil
import com.intellij.ide.util.PropertiesComponent
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.terminal.ui.TerminalWidget
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.NxLatestVersionGeneralCommandLine
import dev.nx.console.utils.NxProvenance
import kotlinx.coroutines.*
import logger
import org.jetbrains.plugins.terminal.TerminalToolWindowManager

@Service(Service.Level.PROJECT)
class PeriodicAiCheckService(private val project: Project, private val cs: CoroutineScope) {

    companion object {
        fun getInstance(project: Project): PeriodicAiCheckService =
            project.getService(PeriodicAiCheckService::class.java)

        private const val AI_CHECK_DONT_ASK_AGAIN_KEY = "dev.nx.console.ai_check_dont_ask_again"
        private const val LAST_AI_CHECK_NOTIFICATION_TIMESTAMP_KEY =
            "dev.nx.console.last_ai_check_notification_timestamp"
        private const val ONE_MINUTE_MS = 60 * 1000L
        private const val ONE_HOUR_MS = 60 * 60 * 1000L
        private const val ONE_DAY_MS = 24 * 60 * 60 * 1000L
    }

    private var checkJob: Job? = null

    fun initialize() {
        if (shouldSkipCheck()) {
            return
        }

        checkJob =
            cs.launch {
                // Wait 1 minute before first check
                delay(ONE_MINUTE_MS)

                runAiAgentCheck()

                // Then check every hour
                while (isActive) {
                    delay(ONE_HOUR_MS)
                    runAiAgentCheck()
                }
            }
    }

    private fun shouldSkipCheck(): Boolean {
        return PropertiesComponent.getInstance(project)
            .getBoolean(AI_CHECK_DONT_ASK_AGAIN_KEY, false)
    }

    private suspend fun runAiAgentCheck() {
        if (shouldSkipCheck()) {
            return
        }

        // Check if we already showed a notification within the last 24 hours
        val lastNotificationTimestamp =
            PropertiesComponent.getInstance(project)
                .getLong(LAST_AI_CHECK_NOTIFICATION_TIMESTAMP_KEY, 0)

        val now = System.currentTimeMillis()
        if (now - lastNotificationTimestamp < ONE_DAY_MS) {
            return
        }

        try {
            // Check provenance first
            val (hasProvenance, _) =
                withContext(Dispatchers.IO) { NxProvenance.nxLatestProvenanceCheck() }
            if (!hasProvenance) {
                return
            }

            // Run the AI configuration check
            val checkCommand =
                NxLatestVersionGeneralCommandLine(project, listOf("configure-ai-agents", "--check"))
            checkCommand.withEnvironment("NX_CONSOLE", "true")
            checkCommand.withEnvironment("NX_AI_FILES_USE_LOCAL", "true")

            val output = withContext(Dispatchers.IO) { ExecUtil.execAndGetOutput(checkCommand) }

            if (output.stdout.contains("The following AI agents are out of date")) {
                // Update timestamp
                PropertiesComponent.getInstance(project)
                    .setValue(LAST_AI_CHECK_NOTIFICATION_TIMESTAMP_KEY, now.toString())

                // Log telemetry
                TelemetryService.getInstance(project)
                    .featureUsed("ai.configure-agents-check-notification")

                // Show notification
                withContext(Dispatchers.EDT) { notifyAiConfigurationOutdated() }
            }
        } catch (e: Exception) {
            logger.info("Failed to run AI configuration check: ${e.message}")
            // Silently fail - this is a non-critical operation
        }
    }

    fun setDontAskAgain() {
        PropertiesComponent.getInstance(project).setValue(AI_CHECK_DONT_ASK_AGAIN_KEY, true)
        checkJob?.cancel()
    }

    private fun notifyAiConfigurationOutdated() {
        val notification =
            NotificationGroupManager.getInstance()
                .getNotificationGroup("Nx Console")
                .createNotification(
                    "Your AI agent configuration is outdated. Would you like to update to the recommended configuration?",
                    NotificationType.INFORMATION,
                )
                .setTitle("Nx Console")

        notification.addActions(
            setOf(
                NotificationAction.createSimpleExpiring("Update") {
                    notification.expire()
                    TelemetryService.getInstance(project).featureUsed("ai.configure-agents-action")

                    // Run configure-ai-agents command
                    cs.launch {
                        withContext(Dispatchers.EDT) {
                            val terminalManager = TerminalToolWindowManager.getInstance(project)
                            val workingDirectory = project.basePath ?: "."

                            val terminalWidget: TerminalWidget =
                                terminalManager.createShellWidget(
                                    workingDirectory,
                                    "configure-ai-agents",
                                    true,
                                    false,
                                )

                            terminalManager.getToolWindow()?.show(null)

                            // Execute command using the new TerminalWidget interface
                            terminalWidget.sendCommandToExecute("npx nx@latest configure-ai-agents")
                        }
                    }
                },
                NotificationAction.createSimpleExpiring("Don't ask again") {
                    notification.expire()
                    TelemetryService.getInstance(project)
                        .featureUsed(
                            "ai.configure-agents-dont-ask-again",
                            mapOf("source" to "notification"),
                        )

                    setDontAskAgain()
                },
            )
        )

        notification.notify(project)
    }
}
