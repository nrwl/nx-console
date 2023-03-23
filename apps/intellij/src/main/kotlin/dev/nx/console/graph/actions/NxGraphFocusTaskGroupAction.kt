package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.graph.NxGraphService
import dev.nx.console.nx_toolwindow.NxSimpleNode
import dev.nx.console.nx_toolwindow.NxTreeNodeKey

class NxGraphFocusTaskGroupAction : DumbAwareAction() {

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
        graphService.showNxGraphInEditor()
        graphService.focusTaskGroup(targetGroup.name)
    }
}
