package dev.nx.console.run.actions

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.terminal.ui.TerminalWidget
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryService
import kotlinx.coroutines.CoroutineScope
import org.jetbrains.plugins.terminal.TerminalToolWindowManager

@Service(Service.Level.PROJECT)
class NxInitService(private val project: Project, private val cs: CoroutineScope) {

    fun runNxInit() {
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

    companion object {
        fun getInstance(project: Project): NxInitService {
            return project.getService(NxInitService::class.java)
        }
    }
}
