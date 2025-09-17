package dev.nx.console.run.actions

import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.terminal.ui.TerminalWidget
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.NxProvenance
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jetbrains.plugins.terminal.TerminalToolWindowManager

@Service(Service.Level.PROJECT)
class NxInitService(private val project: Project, private val cs: CoroutineScope) {

    fun runNxInit() {
        cs.launch {
            val telemetry = TelemetryService.getInstance(project)
            telemetry.featureUsed(TelemetryEvent.CLI_INIT)
            val (hasProvenance, errorMessage) = NxProvenance.nxLatestProvenanceCheck()
            if (!hasProvenance) {
                telemetry.featureUsed(TelemetryEvent.MISC_NX_LATEST_NO_PROVENANCE)
                val message = errorMessage ?: NxProvenance.NO_PROVENANCE_ERROR
                Notifier.notifyAnything(
                    project,
                    message,
                    com.intellij.notification.NotificationType.ERROR,
                )
                return@launch
            }
            withContext(Dispatchers.EDT) {
                val terminalManager = TerminalToolWindowManager.getInstance(project)
                val workingDirectory = project.basePath ?: "."

                // Use the non-deprecated createShellWidget
                // This returns a TerminalWidget, which is the new common interface
                val terminalWidget: TerminalWidget =
                    terminalManager.createShellWidget(workingDirectory, "Nx Init", true, false)

                // Optionally show the terminal tool window
                terminalManager.getToolWindow()?.show(null)

                // Execute command using the new TerminalWidget interface
                terminalWidget.sendCommandToExecute("npx nx@latest init")

                TelemetryService.getInstance(project).featureUsed(TelemetryEvent.TASK_INIT)
            }
        }
    }

    companion object {
        fun getInstance(project: Project): NxInitService {
            return project.getService(NxInitService::class.java)
        }
    }
}
