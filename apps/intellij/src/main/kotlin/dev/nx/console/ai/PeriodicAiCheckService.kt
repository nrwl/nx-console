package dev.nx.console.ai

import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.process.KillableColoredProcessHandler
import com.intellij.execution.ui.RunContentDescriptor
import com.intellij.execution.ui.RunContentManager
import com.intellij.ide.util.PropertiesComponent
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import dev.nx.console.NxIcons
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.NxLatestVersionGeneralCommandLine
import dev.nx.console.utils.NxProvenance
import dev.nx.console.utils.nxWorkspace
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.*

@Service(Service.Level.PROJECT)
class PeriodicAiCheckService(private val project: Project) : Disposable {

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

    private val coroutineScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var checkJob: Job? = null

    fun initialize() {
        if (shouldSkipCheck()) {
            return
        }

        checkJob =
            coroutineScope.launch {
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

        val nxWorkspace = project.nxWorkspace() ?: return

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

            val output =
                withContext(Dispatchers.IO) {
                    try {
                        val process = checkCommand.createProcess()
                        val exitCode = process.waitFor(30, TimeUnit.SECONDS)
                        if (!exitCode || process.exitValue() != 0) {
                            // Read error output
                            process.errorStream.bufferedReader().use { it.readText() }
                        } else {
                            null
                        }
                    } catch (e: Exception) {
                        e.message
                    }
                }

            if (output != null && output.contains("The following AI agents are out of date")) {
                // Update timestamp
                PropertiesComponent.getInstance(project)
                    .setValue(LAST_AI_CHECK_NOTIFICATION_TIMESTAMP_KEY, now.toString())

                // Log telemetry
                TelemetryService.getInstance(project)
                    .featureUsed(
                        "ai.configure-agents-check-notification",
                        mapOf("source" to "notification"),
                    )

                // Show notification
                withContext(Dispatchers.Main) { notifyAiConfigurationOutdated() }
            }
        } catch (e: Exception) {
            // Silently fail - this is a non-critical operation
        }
    }

    fun setDontAskAgain() {
        PropertiesComponent.getInstance(project).setValue(AI_CHECK_DONT_ASK_AGAIN_KEY, true)
        checkJob?.cancel()
    }

    override fun dispose() {
        coroutineScope.cancel()
    }

    private fun notifyAiConfigurationOutdated() {
        val notification =
            NotificationGroupManager.getInstance().getNotificationGroup("Nx Console")
                .createNotification(
                    "Your AI agent configuration is outdated. Would you like to update to the recommended configuration?",
                    NotificationType.INFORMATION,
                )
                .setTitle("Nx Console")

        notification.addActions(
            setOf(
                NotificationAction.createSimpleExpiring("Update") {
                    notification.expire()
                    // Log telemetry
                    dev.nx.console.telemetry.TelemetryService.getInstance(project)
                        .featureUsed(
                            "ai.configure-agents-action",
                            mapOf("source" to "notification"),
                        )

                    // Run configure-ai-agents command
                    val coroutineScope = CoroutineScope(Dispatchers.Default)
                    coroutineScope.launch {
                        val configureCommand =
                            NxLatestVersionGeneralCommandLine(
                                project,
                                listOf("configure-ai-agents"),
                            )
                        configureCommand.withEnvironment("NX_CONSOLE", "true")
                        configureCommand.withEnvironment("NX_AI_FILES_USE_LOCAL", "true")

                        withContext(Dispatchers.Main) {
                            val processHandler = KillableColoredProcessHandler(configureCommand)
                            val console =
                                com.intellij.execution.impl.ConsoleViewImpl(project, true)

                            console.attachToProcess(processHandler)

                            val contentDescriptor =
                                RunContentDescriptor(
                                    console,
                                    processHandler,
                                    console.component,
                                    "Configure AI Agents",
                                    NxIcons.Action,
                                )

                            val runContentManager = RunContentManager.getInstance(project)
                            runContentManager.showRunContent(
                                DefaultRunExecutor.getRunExecutorInstance(),
                                contentDescriptor,
                            )

                            processHandler.startNotify()
                        }
                    }
                },
                NotificationAction.createSimpleExpiring("Don't ask again") {
                    notification.expire()
                    // Log telemetry
                    dev.nx.console.telemetry.TelemetryService.getInstance(project)
                        .featureUsed(
                            "ai.configure-agents-dont-ask-again",
                            mapOf("source" to "notification"),
                        )

                    // Set don't ask again flag
                    dev.nx.console.ai.PeriodicAiCheckService.getInstance(project)
                        .setDontAskAgain()
                },
            )
        )

        notification.notify(project)
    }
}
