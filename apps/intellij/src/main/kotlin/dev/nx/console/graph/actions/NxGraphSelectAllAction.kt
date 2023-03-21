package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import dev.nx.console.graph.NxGraphService

class NxGraphSelectAllAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val graphService = NxGraphService.getInstance(project)
        graphService.showProjectGraphInEditor()
        graphService.selectAllProjects()
    }
}
