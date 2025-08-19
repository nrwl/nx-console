package dev.nx.console.mcp

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAware

/**
 * Action to set up the MCP server for the current project. When triggered, it adds the necessary
 * configuration to workspace.xml.
 */
class SetupMcpServerAction : AnAction(), DumbAware {
    override fun getActionUpdateThread() = ActionUpdateThread.EDT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        McpServerService.getInstance(project).setupMcpServer()
    }
}
