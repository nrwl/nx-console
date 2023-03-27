package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.graph.NxGraphService
import dev.nx.console.services.telemetry.TelemetryService

class NxGraphSelectAllAction : DumbAwareAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        TelemetryService.getInstance(project).featureUsed("Nx Graph Select All")

        val graphService = NxGraphService.getInstance(project)
        graphService.showNxGraphInEditor()
        graphService.selectAllProjects()
    }
}
