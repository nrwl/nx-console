package dev.nx.console.graph

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import dev.nx.console.nx_toolwindow.NxSimpleNode
import dev.nx.console.nx_toolwindow.NxTreeNodeKey

class NxGraphFocusTaskAction : AnAction() {

    override fun update(e: AnActionEvent) {
        val target: NxSimpleNode.Target? =
            e.getData(NxTreeNodeKey).let { it as? NxSimpleNode.Target }

        if (target == null) {
            e.presentation.isEnabledAndVisible = false
        } else {
            e.presentation.text = "Nx Graph: Focus ${target.nxProject}:${target.nxTarget} target"
        }
    }
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val target: NxSimpleNode.Target =
            e.getData(NxTreeNodeKey).let { it as? NxSimpleNode.Target } ?: return

        val graphService = NxGraphService.getInstance(project)
        graphService.showProjectGraphInEditor()
        graphService.focusTask(target.nxProject, target.nxTarget)
    }
}
