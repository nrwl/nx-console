package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DataContext
import dev.nx.console.graph.NxGraphService
import dev.nx.console.nx_toolwindow.NxSimpleNode
import dev.nx.console.nx_toolwindow.NxTreeNodeKey
import dev.nx.console.utils.NxTargetDescriptor

class NxGraphFocusTaskAction(private val targetDescriptor: NxTargetDescriptor? = null) :
    AnAction() {

    override fun update(e: AnActionEvent) {
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

        val targetDescriptor =
            this.targetDescriptor ?: getTargetDescriptorFromDataContext(e.dataContext) ?: return

        val graphService = NxGraphService.getInstance(project)
        graphService.showProjectGraphInEditor()
        graphService.focusTask(targetDescriptor.nxProject, targetDescriptor.nxTarget)
    }

    private fun getTargetDescriptorFromDataContext(dataContext: DataContext): NxTargetDescriptor? {
        val targetTreeNode: NxSimpleNode.Target? =
            dataContext.getData(NxTreeNodeKey).let { it as? NxSimpleNode.Target }

        if (targetTreeNode != null) {
            return NxTargetDescriptor(targetTreeNode.nxProject, targetTreeNode.nxTarget)
        }

        return null
    }
}
