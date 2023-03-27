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

data class NxTaskSet(val nxProjects: List<String>, val nxTargets: List<String>)

val NxTaskSet.suggestedName: String
    get() {
        var name = nxProjects.joinToString(separator = ",")
        name +=
            if (nxTargets.size > 1) {
                " --targets=${nxTargets.joinToString(separator = ",")}"
            } else {
                ":${nxTargets.first()}"
            }

        return name
    }
