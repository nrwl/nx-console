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

data class NxWorkspace(val name: String, val nxProjects: List<NxProject>)

fun Project.nxWorkspace() = runBlocking {
    val workspace = service<NxlsService>().workspace()?.get("workspace")
    val nxName = workspace?.asJsonObject?.get("npmScope")?.asString ?: "nx"
    val nxProjects =
        workspace?.asJsonObject?.get("projects")?.asJsonObject?.entrySet()?.map { entry ->
            NxProject(
                name = entry.key,
                projectType = entry.value?.asJsonObject?.get("projectType")?.asString ?: "library",
                targets =
                    entry.value?.asJsonObject?.get("targets")?.asJsonObject?.keySet()?.toList()
                        ?: emptyList(),
            )
        }
            ?: emptyList()
    NxWorkspace(nxName, nxProjects)
}

data class NxProject(val name: String, val projectType: String, val targets: List<String>)

data class NxTaskSet(val nxProjects: List<String>, val nxTargets: List<String>)

val NxTaskSet.suggestedName
    get() =
        nxProjects.joinToString(separator = ",") + nxTargets.joinToString(separator = ",", "[", "]")
