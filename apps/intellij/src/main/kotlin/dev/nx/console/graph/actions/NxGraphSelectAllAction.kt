package dev.nx.console.graph.actions

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.platform.ide.progress.runWithModalProgressBlocking
import dev.nx.console.graph.getNxGraphService
import dev.nx.console.nx_toolwindow.NxToolWindowPanel
import dev.nx.console.telemetry.TelemetryService
import javax.swing.Icon

open class NxGraphSelectAllAction(
    text: String? = null,
    description: String? = null,
    icon: Icon? = null
) : DumbAwareAction(text, description, icon) {

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        if (e.place == NxToolWindowPanel.NX_TOOLBAR_PLACE) {
            e.presentation.text = "View Full Project Graph"
            e.presentation.icon = AllIcons.Graph.Layout
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        TelemetryService.getInstance(project).featureUsed("Nx Graph Select All")

        runWithModalProgressBlocking(project, "Opening Nx Graph") {
            val nxGraphService = getNxGraphService(project) ?: return@runWithModalProgressBlocking
            ApplicationManager.getApplication().invokeLater { nxGraphService.selectAllProjects() }
        }
    }
}
