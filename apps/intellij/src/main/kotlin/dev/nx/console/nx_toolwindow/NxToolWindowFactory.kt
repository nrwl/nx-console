package dev.nx.console.nx_toolwindow

import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory

private class NxToolWindowFactory : ToolWindowFactory, DumbAware {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val toolwindowPanel = NxToolWindowPanel(project)
        val contentManager = toolWindow.contentManager
        val content = contentManager.factory.createContent(toolwindowPanel, null, false)
        content.isCloseable = false
        contentManager.addContent(content)
        toolWindow.setAdditionalGearActions(DefaultActionGroup(ToggleNxCloudViewAction()))
    }
}
