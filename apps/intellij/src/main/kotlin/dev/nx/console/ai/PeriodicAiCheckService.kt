package dev.nx.console.ai

import com.intellij.execution.util.ExecUtil
import com.intellij.ide.BrowserUtil
import com.intellij.ide.util.PropertiesComponent
import com.intellij.notification.Notification
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import dev.nx.console.mcp.McpServerService
import dev.nx.console.nxls.NxlsService
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.NxLatestVersionGeneralCommandLine
import dev.nx.console.utils.NxProvenance
import dev.nx.console.utils.sync_services.NxVersionUtil
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Service(Service.Level.PROJECT)
class PeriodicAiCheckService(private val project: Project, private val cs: CoroutineScope) {

    companion object {
        fun getInstance(project: Project): PeriodicAiCheckService =
            project.getService(PeriodicAiCheckService::class.java)

        private const val AI_CHECK_DONT_ASK_AGAIN_KEY = "dev.nx.console.ai_check_dont_ask_again"
        private const val LAST_AI_CHECK_NOTIFICATION_TIMESTAMP_KEY =
            "dev.nx.console.last_ai_check_notification_timestamp"
        private const val LAST_AI_CONFIGURE_NOTIFICATION_TIMESTAMP_KEY =
            "dev.nx.console.last_ai_configure_notification_timestamp"
        private const val THREE_MINUTES_MS = 3 * 60 * 1000L
        private const val THREE_HOURS_MS = 3 * 60 * 60 * 1000L
        private const val TWELVE_HOURS_MS = 12 * 60 * 60 * 1000L
        private const val ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000L
        private const val COMMAND_TIMEOUT_MS = 360000
    }

    private var checkJob: Job? = null

    fun initialize() {
        if (shouldSkipCheck()) {
            return
        }

        checkJob =
            cs.launch {
                delay(THREE_MINUTES_MS)
                runAiAgentCheck()

                while (isActive) {
                    delay(THREE_HOURS_MS)
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

        val nxVersion = NxVersionUtil.getInstance(project).getNxVersionSynchronously()
        if (
            nxVersion != null &&
                (nxVersion.major > 22 || (nxVersion.major == 22 && nxVersion.minor >= 6))
        ) {
            runAiAgentCheckViaDaemon()
        } else {
            runAiAgentCheckLegacy()
        }
    }

    private suspend fun runAiAgentCheckViaDaemon() {
        if (shouldSkipCheck()) {
            return
        }

        val now = System.currentTimeMillis()

        try {
            val status = NxlsService.getInstance(project).configureAiAgentsStatus() ?: return

            if (status.outdatedAgents.isNotEmpty()) {
                val lastUpdateNotificationTimestamp =
                    PropertiesComponent.getInstance(project)
                        .getLong(LAST_AI_CHECK_NOTIFICATION_TIMESTAMP_KEY, 0)
                if (now - lastUpdateNotificationTimestamp < TWELVE_HOURS_MS) {
                    return
                }

                PropertiesComponent.getInstance(project)
                    .setValue(LAST_AI_CHECK_NOTIFICATION_TIMESTAMP_KEY, now.toString())

                TelemetryService.getInstance(project)
                    .featureUsed(TelemetryEvent.AI_CONFIGURE_AGENTS_CHECK_NOTIFICATION)

                withContext(Dispatchers.EDT) { notifyAiConfigurationOutdated() }
                return
            }

            if (
                status.partiallyConfiguredAgents.isNotEmpty() ||
                    status.nonConfiguredAgents.isNotEmpty()
            ) {
                val lastConfigureNotificationTimestamp =
                    PropertiesComponent.getInstance(project)
                        .getLong(LAST_AI_CONFIGURE_NOTIFICATION_TIMESTAMP_KEY, 0)
                if (now - lastConfigureNotificationTimestamp < ONE_WEEK_MS) {
                    return
                }

                PropertiesComponent.getInstance(project)
                    .setValue(LAST_AI_CONFIGURE_NOTIFICATION_TIMESTAMP_KEY, now.toString())

                TelemetryService.getInstance(project)
                    .featureUsed(TelemetryEvent.AI_CONFIGURE_AGENTS_SETUP_NOTIFICATION)

                withContext(Dispatchers.EDT) { notifyAiConfigurationMissing() }
            }
        } catch (e: Exception) {
            // Silently fail - non-critical background check
        }
    }

    private suspend fun runAiAgentCheckLegacy() {
        if (shouldSkipCheck()) {
            return
        }

        val now = System.currentTimeMillis()

        try {
            val workspaceRoot = project.basePath ?: "."

            // Only run AI checks in Nx workspaces
            if (!File(workspaceRoot, "nx.json").exists()) {
                return
            }

            val (hasProvenance, _) =
                withContext(Dispatchers.IO) { NxProvenance.nxLatestProvenanceCheck(workspaceRoot) }

            if (!hasProvenance) {
                return
            }

            val checkCommand =
                NxLatestVersionGeneralCommandLine(project, listOf("configure-ai-agents", "--check"))
            checkCommand.withEnvironment("NX_CONSOLE", "true")
            checkCommand.withEnvironment("NX_AI_FILES_USE_LOCAL", "true")

            val output =
                withContext(Dispatchers.IO) {
                    ExecUtil.execAndGetOutput(checkCommand, COMMAND_TIMEOUT_MS)
                }

            if (output.stdout.contains("The following AI agents are out of date")) {
                val lastUpdateNotificationTimestamp =
                    PropertiesComponent.getInstance(project)
                        .getLong(LAST_AI_CHECK_NOTIFICATION_TIMESTAMP_KEY, 0)
                if (now - lastUpdateNotificationTimestamp < TWELVE_HOURS_MS) {
                    return
                }

                PropertiesComponent.getInstance(project)
                    .setValue(LAST_AI_CHECK_NOTIFICATION_TIMESTAMP_KEY, now.toString())

                TelemetryService.getInstance(project)
                    .featureUsed(TelemetryEvent.AI_CONFIGURE_AGENTS_CHECK_NOTIFICATION)

                withContext(Dispatchers.EDT) { notifyAiConfigurationOutdated() }
                return
            }

            val lastConfigureNotificationTimestamp =
                PropertiesComponent.getInstance(project)
                    .getLong(LAST_AI_CONFIGURE_NOTIFICATION_TIMESTAMP_KEY, 0)
            if (now - lastConfigureNotificationTimestamp < ONE_WEEK_MS) {
                return
            }
            val checkAllCommand =
                NxLatestVersionGeneralCommandLine(
                    project,
                    listOf("configure-ai-agents", "--check=all"),
                )
            checkAllCommand.withEnvironment("NX_CONSOLE", "true")
            checkAllCommand.withEnvironment("NX_AI_FILES_USE_LOCAL", "true")

            val checkAllOutput =
                withContext(Dispatchers.IO) {
                    ExecUtil.execAndGetOutput(checkAllCommand, COMMAND_TIMEOUT_MS)
                }

            if (checkAllOutput.exitCode != 0) {
                if (
                    !checkAllOutput.stdout.contains("The following agents are not fully configured")
                ) {
                    return
                }

                PropertiesComponent.getInstance(project)
                    .setValue(LAST_AI_CONFIGURE_NOTIFICATION_TIMESTAMP_KEY, now.toString())

                TelemetryService.getInstance(project)
                    .featureUsed(TelemetryEvent.AI_CONFIGURE_AGENTS_SETUP_NOTIFICATION)

                withContext(Dispatchers.EDT) { notifyAiConfigurationMissing() }
            }
        } catch (e: Exception) {
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
            setOf(UpdateConfigurationAction(notification), DontAskAgainAction(notification))
        )

        notification.notify(project)
    }

    private fun notifyAiConfigurationMissing() {
        val notification =
            NotificationGroupManager.getInstance()
                .getNotificationGroup("Nx Console")
                .createNotification(
                    "Want Nx to configure your AI agents and MCP setup?",
                    NotificationType.INFORMATION,
                )
                .setTitle("Nx Console")

        notification.addActions(
            setOf(
                SetupConfigurationAction(notification),
                LearnMoreAction(notification),
                DontAskAgainAction(notification),
            )
        )

        notification.notify(project)
    }

    private inner class UpdateConfigurationAction(private val notification: Notification) :
        NotificationAction("Yes") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            notification.expire()
            TelemetryService.getInstance(project)
                .featureUsed(
                    TelemetryEvent.AI_CONFIGURE_AGENTS_ACTION,
                    mapOf("source" to "notification"),
                )
            ConfigureAiAgentsService.getInstance(project).runConfigureCommand()
        }
    }

    private inner class SetupConfigurationAction(private val notification: Notification) :
        NotificationAction("Yes") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            notification.expire()
            TelemetryService.getInstance(project)
                .featureUsed(
                    TelemetryEvent.AI_CONFIGURE_AGENTS_SETUP_ACTION,
                    mapOf("source" to "notification"),
                )
            ConfigureAiAgentsService.getInstance(project).runConfigureCommand()
            McpServerService.getInstance(project).setupMcpServer()
        }
    }

    private inner class LearnMoreAction(private val notification: Notification) :
        NotificationAction("Learn more") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            TelemetryService.getInstance(project)
                .featureUsed(
                    TelemetryEvent.AI_CONFIGURE_AGENTS_LEARN_MORE,
                    mapOf("source" to "notification"),
                )
            BrowserUtil.browse(
                "https://nx.dev/docs/getting-started/ai-setup#configure-nx-ai-integration"
            )
        }
    }

    private inner class DontAskAgainAction(private val notification: Notification) :
        NotificationAction("Don't ask again") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            notification.expire()
            TelemetryService.getInstance(project)
                .featureUsed(
                    TelemetryEvent.AI_CONFIGURE_AGENTS_DONT_ASK_AGAIN,
                    mapOf("source" to "notification"),
                )
            setDontAskAgain()
        }
    }
}
