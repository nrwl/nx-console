package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import dev.nx.console.graph.NxGraphService
import dev.nx.console.nx_toolwindow.NxSimpleNode
import dev.nx.console.nx_toolwindow.NxTreeNodeKey
import dev.nx.console.services.NxlsService
import dev.nx.console.services.telemetry.TelemetryService
import dev.nx.console.utils.NxTargetDescriptor
import dev.nx.console.utils.getNxProjectFromDataContext
import javax.swing.ListSelectionModel
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
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
                        selectProjectAndTarget(project, e.dataContext)
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
            return NxTargetDescriptor(targetTreeNode.nxProject, targetTreeNode.nxTarget)
        }

        return null
    }

    private suspend fun selectProjectAndTarget(
        project: Project,
        dataContext: DataContext
    ): NxTargetDescriptor? {
        var nxProject = getNxProjectFromDataContext(project, dataContext)
        if (nxProject == null) {
            nxProject = selectProject(project, dataContext) ?: return null
        }

        val nxTarget: String =
            selectTargetForProject(project, dataContext, nxProject) ?: return null

        return NxTargetDescriptor(nxProject, nxTarget)
    }

    private suspend fun selectProject(
        project: Project,
        dataContext: DataContext,
    ) =
        suspendCoroutine<String?> {
            val projects = runBlocking {
                NxlsService.getInstance(project).workspace()?.workspace?.projects?.keys?.toList()
                    ?: emptyList()
            }
            ApplicationManager.getApplication().invokeLater {
                val popup =
                    JBPopupFactory.getInstance()
                        .createPopupChooserBuilder(projects)
                        .setTitle("Select project")
                        .setSelectionMode(ListSelectionModel.SINGLE_SELECTION)
                        .setRequestFocus(true)
                        .setFilterAlwaysVisible(true)
                        .setResizable(true)
                        .setMovable(true)
                        .setItemChosenCallback { chosen -> it.resume(chosen) }
                        .setDimensionServiceKey("nx.dev.console.select_target")
                        .createPopup()

                popup.showInBestPositionFor(dataContext)
            }
        }

    private suspend fun selectTargetForProject(
        project: Project,
        dataContext: DataContext,
        nxProject: String,
    ) =
        suspendCoroutine<String?> {
            val targets = runBlocking {
                NxlsService.getInstance(project)
                    .workspace()
                    ?.workspace
                    ?.projects
                    ?.get(nxProject)
                    ?.targets
                    ?.keys
                    ?.toList()
                    ?: emptyList()
            }

            ApplicationManager.getApplication().invokeLater {
                val popup =
                    JBPopupFactory.getInstance()
                        .createPopupChooserBuilder(targets)
                        .setTitle("Select target of $nxProject")
                        .setSelectionMode(ListSelectionModel.SINGLE_SELECTION)
                        .setRequestFocus(true)
                        .setFilterAlwaysVisible(true)
                        .setResizable(true)
                        .setMovable(true)
                        .setItemChosenCallback { chosen -> it.resume(chosen) }
                        .setDimensionServiceKey("nx.dev.console.select_target")
                        .createPopup()

                popup.showInBestPositionFor(dataContext)
            }
        }
}
