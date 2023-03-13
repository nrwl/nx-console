package dev.nx.console.toolWindow

import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import dev.nx.console.services.NxlsService
import kotlinx.coroutines.runBlocking

class NxToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val toolwindowPanel = NxToolWindowPanel(project)
        val contentManager = toolWindow.contentManager
        val content = contentManager.factory.createContent(toolwindowPanel, null, false)
        content.isCloseable = false
        contentManager.addContent(content)
    }
}

fun Project.nxWorkspace() = runBlocking { service<NxlsService>().workspace() }

data class NxTaskSet(val nxProjects: List<String>, val nxTargets: List<String>)

val NxTaskSet.suggestedName
    get() =
        nxProjects.joinToString(separator = ",") + nxTargets.joinToString(separator = ",", "[", "]")
