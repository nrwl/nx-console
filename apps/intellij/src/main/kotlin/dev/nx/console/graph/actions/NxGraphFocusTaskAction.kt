package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.graph.NxGraphService
import dev.nx.console.nx_toolwindow.NxSimpleNode
import dev.nx.console.nx_toolwindow.NxTreeNodeKey
import dev.nx.console.services.NxlsService
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.ui.Notifier
import dev.nx.console.utils.NxTargetDescriptor
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

        val path = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path ?: return

        CoroutineScope(Dispatchers.Default).launch {
            val currentlyOpenedProject =
                NxlsService.getInstance(project).generatorContextFromPath(path = path)?.project
            val targetDescriptor: NxTargetDescriptor =
                this@NxGraphFocusTaskAction.targetDescriptor
                    ?: if (e.place == "NxToolWindow") {
                        getTargetDescriptorFromDataContext(e.dataContext)
                    } else {
                        val nxProject =
                            if (ActionPlaces.isPopupPlace(e.place)) currentlyOpenedProject
                            else selectNxProject(project, e.dataContext, currentlyOpenedProject)

                        if (nxProject == null) {
                            Notifier.notifyNoProject(project, path)
                            return@launch
                        }

                        val nxTarget =
                            selectTargetForNxProject(project, e.dataContext, nxProject)
                                ?: return@launch

                        NxTargetDescriptor(nxProject, nxTarget)
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
}
