package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import dev.nx.console.graph.NxGraphService
import dev.nx.console.nx_toolwindow.NxSimpleNode
import dev.nx.console.nx_toolwindow.NxTreeNodeKey

class NxGraphFocusTaskGroupAction : AnAction() {

    override fun update(e: AnActionEvent) {
        val targetGroup: NxSimpleNode.TargetGroup? =
            e.getData(NxTreeNodeKey).let { it as? NxSimpleNode.TargetGroup }

        if (targetGroup == null) {
            e.presentation.isEnabledAndVisible = false
        } else {
            e.presentation.text = "Nx Graph: Focus ${targetGroup.name} targets"
        }
    }
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val targetGroup: NxSimpleNode.TargetGroup =
            e.getData(NxTreeNodeKey).let { it as? NxSimpleNode.TargetGroup } ?: return

        val graphService = NxGraphService.getInstance(project)
        graphService.showProjectGraphInEditor()
        graphService.focusTaskGroup(targetGroup.name)
    }
}
