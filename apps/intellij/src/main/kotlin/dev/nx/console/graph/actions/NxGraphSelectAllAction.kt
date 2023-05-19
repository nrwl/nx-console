package dev.nx.console.graph.actions

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.graph.NxGraphService
import dev.nx.console.nx_toolwindow.NxToolWindow
import dev.nx.console.telemetry.TelemetryService
import javax.swing.Icon

open class NxGraphSelectAllAction(
    text: String? = null,
    description: String? = null,
    icon: Icon? = null
) : DumbAwareAction(text, description, icon) {

    override fun getActionUpdateThread() = ActionUpdateThread.EDT

    override fun update(e: AnActionEvent) {
        if (e.place == NxToolWindow.NX_TOOLBAR_PLACE) {
            e.presentation.text = "View Full Project Graph"
            e.presentation.icon = AllIcons.Graph.Layout
        }
    }
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        TelemetryService.getInstance(project).featureUsed("Nx Graph Select All")

        val graphService = NxGraphService.getInstance(project)
        graphService.showNxGraphInEditor()
        graphService.selectAllProjects()
    }
}
