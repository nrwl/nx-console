package dev.nx.console.ai

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.terminal.ui.TerminalWidget
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jetbrains.plugins.terminal.TerminalToolWindowManager

class ConfigureAiAgentsAction : AnAction() {
    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        TelemetryService.getInstance(project)
            .featureUsed(
                TelemetryEvent.AI_CONFIGURE_AGENTS_SETUP_ACTION,
                mapOf("source" to "command"),
            )
        ConfigureAiAgentsService.getInstance(project).runConfigureCommand()
    }
}

@Service(Service.Level.PROJECT)
class ConfigureAiAgentsService(private val project: Project, private val cs: CoroutineScope) {
    fun runConfigureCommand() {
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

                terminalWidget.sendCommandToExecute("npx nx@latest configure-ai-agents")
            }
        }
    }

    companion object {
        fun getInstance(project: Project): ConfigureAiAgentsService {
            return project.getService(ConfigureAiAgentsService::class.java)
        }
    }
}
