package dev.nx.console.mcp

import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAware

/**
 * Action to set up the MCP server for the current project. When triggered, it adds the necessary
 * configuration to workspace.xml.
 */
class SetupMcpServerAction : AnAction(), DumbAware {
    override fun update(e: AnActionEvent) {
        super.update(e)
        val aiAssistantPlugin =
            PluginManagerCore.plugins.find { it.pluginId.idString == "com.intellij.ml.llm" }
        if (aiAssistantPlugin == null) {
            e.presentation.isEnabledAndVisible = false
            return
        }
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        McpServerService.getInstance(project).setupMcpServer()
    }
}
