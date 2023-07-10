package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.graph.NxGraphService
import dev.nx.console.nx_toolwindow.NxSimpleNode
import dev.nx.console.nx_toolwindow.NxTreeNodeKey
import dev.nx.console.services.NxlsService
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.ui.Notifier
import dev.nx.console.utils.selectNxProject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class NxGraphFocusProjectAction : DumbAwareAction("Nx Graph: Focus Project") {
    override fun update(e: AnActionEvent) {
        val nxTreeNode = e.getData(NxTreeNodeKey) ?: return
        if (nxTreeNode !is NxSimpleNode.Project) {
            e.presentation.isEnabledAndVisible = false
        }
    }
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project).featureUsed("Nx Graph Select Project")
        val path = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path

        CoroutineScope(Dispatchers.Default).launch {
            val currentlyOpenedProject =
                path?.let {
                    NxlsService.getInstance(project).generatorContextFromPath(path = it)?.project
                }

            val nxProjectName: String? = getNxProject(e, currentlyOpenedProject)

            if (nxProjectName == null) {
                Notifier.notifyNoProject(project, path)
                return@launch
            }

            ApplicationManager.getApplication().invokeLater {
                val graphService = NxGraphService.getInstance(project)
                graphService.showNxGraphInEditor()
                graphService.focusProject(nxProjectName)
            }
        }
    }

    private suspend fun getNxProject(e: AnActionEvent, currentlyOpenedProject: String?): String? {
        val nxTreeNodeProject = e.getData(NxTreeNodeKey)?.nxProject
        if (nxTreeNodeProject != null) {
            return nxTreeNodeProject.name
        }

        val project = e.project ?: return null

        return if (ActionPlaces.isPopupPlace(e.place)) currentlyOpenedProject
        else selectNxProject(project, e.dataContext, currentlyOpenedProject)
    }
}
