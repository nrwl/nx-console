package dev.nx.console.nx_toolwindow

import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory

class NxToolWindowFactory : ToolWindowFactory, DumbAware {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val toolwindowPanel = NxToolWindowPanel(project)
        val contentManager = toolWindow.contentManager
        val content = contentManager.factory.createContent(toolwindowPanel, null, false)
        content.isCloseable = false
        contentManager.addContent(content)
    }
}

data class NxTaskSet(
    val nxProject: String,
    val nxTarget: String,
    val nxTargetConfiguration: String?
) {
    constructor(nxProject: String, nxTarget: String) : this(nxProject, nxTarget, null) {}
    val suggestedName =
        "${nxProject}:${nxTarget}${if(nxTargetConfiguration.isNullOrBlank().not()) ":$nxTargetConfiguration" else ""}"
}
