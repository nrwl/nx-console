package dev.nx.console.graph

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import dev.nx.console.services.NxlsService
import kotlinx.coroutines.runBlocking

class NxGraphFocusProjectAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val path = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path ?: return

        runBlocking { NxlsService.getInstance(project).generatorContextFromPath(path = path) }
            ?.apply {
                if (projectName == null) return

                val graphService = NxGraphService.getInstance(project)
                graphService.showProjectGraphInEditor()
                graphService.focusProject(projectName)
            }
    }
}
