package dev.nx.console.run.actions

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import kotlinx.coroutines.CoroutineScope
import org.jetbrains.plugins.terminal.TerminalToolWindowManager

class NxInitAction : AnAction() {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        NxInitService.getInstance(project).runNxInit()
    }
}

@Service(Service.Level.PROJECT)
class NxInitService(private val project: Project, private val cs: CoroutineScope) {

    @Suppress("DEPRECATION")
    fun runNxInit() {
        val terminalManager = TerminalToolWindowManager.getInstance(project)
        val workingDirectory = project.basePath ?: "."

        // @Suppress("DEPRECATION")
        val shellWidget = terminalManager.createLocalShellWidget(workingDirectory, "Nx Init")

        // Optionally show the terminal tool window
        terminalManager.getToolWindow()?.show(null)

        shellWidget.executeCommand("npx nx@latest init")
    }

    companion object {
        fun getInstance(project: Project): NxInitService {
            return project.getService(NxInitService::class.java)
        }
    }
}
