package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.project.Project
import dev.nx.console.graph.NxGraphService
import dev.nx.console.nx_toolwindow.NxSimpleNode
import dev.nx.console.nx_toolwindow.NxTreeNodeKey
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.NxTargetDescriptor
import dev.nx.console.utils.getNxProjectFromDataContext
import dev.nx.console.utils.selectNxProject
import dev.nx.console.utils.selectTargetForNxProject
import kotlinx.coroutines.*

class NxGraphFocusTaskAction(private val targetDescriptor: NxTargetDescriptor? = null) :
    DumbAwareAction() {

    override fun update(e: AnActionEvent) {
        if (e.place != "NxToolWindow" && targetDescriptor == null) {
            return
        }
        val targetDescriptor =
            this.targetDescriptor ?: getTargetDescriptorFromDataContext(e.dataContext)
        if (targetDescriptor == null) {
            e.presentation.isEnabledAndVisible = false
        } else {
            e.presentation.text =
                "Nx Graph: Focus ${targetDescriptor.nxProject}:${targetDescriptor.nxTarget} target"
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project).featureUsed("Nx Graph Focus Task")

        CoroutineScope(Dispatchers.Default).launch {
            val targetDescriptor =
                this@NxGraphFocusTaskAction.targetDescriptor
                    ?: if (e.place != "NxToolWindow") {
                        selectProjectAndTarget(project, e)
                    } else {
                        getTargetDescriptorFromDataContext(e.dataContext)
                    }
                        ?: return@launch
            ApplicationManager.getApplication().invokeLater {
                val graphService = NxGraphService.getInstance(project)
                graphService.showNxGraphInEditor()
                graphService.focusTask(targetDescriptor.nxProject, targetDescriptor.nxTarget)
            }
        }
    }

    private fun getTargetDescriptorFromDataContext(dataContext: DataContext): NxTargetDescriptor? {
        val targetTreeNode: NxSimpleNode.Target? =
            dataContext.getData(NxTreeNodeKey).let { it as? NxSimpleNode.Target }

        if (targetTreeNode != null) {
            return NxTargetDescriptor(targetTreeNode.nxProjectName, targetTreeNode.nxTargetName)
        }

        return null
    }

    private suspend fun selectProjectAndTarget(
        project: Project,
        e: AnActionEvent
    ): NxTargetDescriptor? {
        val currentlyOpenedProject = getNxProjectFromDataContext(project, e.dataContext)

        val nxProject =
            if (ActionPlaces.isPopupPlace(e.place)) currentlyOpenedProject
            else selectNxProject(project, e.dataContext, currentlyOpenedProject)

        if (nxProject == null) {
            return null
        }

        val nxTarget: String =
            selectTargetForNxProject(project, e.dataContext, nxProject) ?: return null

        return NxTargetDescriptor(nxProject, nxTarget)
    }
}
