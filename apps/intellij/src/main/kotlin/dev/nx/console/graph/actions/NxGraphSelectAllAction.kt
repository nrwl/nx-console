package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.graph.NxGraphService

class NxGraphSelectAllAction : DumbAwareAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val graphService = NxGraphService.getInstance(project)
        graphService.showNxGraphInEditor()
        graphService.selectAllProjects()
    }
}
