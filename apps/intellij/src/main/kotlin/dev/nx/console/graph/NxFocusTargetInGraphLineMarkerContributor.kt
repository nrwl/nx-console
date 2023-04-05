package dev.nx.console.graph

import com.intellij.execution.lineMarker.RunLineMarkerContributor
import com.intellij.icons.AllIcons
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import dev.nx.console.graph.actions.NxGraphFocusTaskAction
import dev.nx.console.utils.getNxTargetDescriptorFromTargetNode
import dev.nx.console.utils.getTargetNodeFromLeafNode

class NxFocusTargetInGraphLineMarkerContributor : RunLineMarkerContributor() {
    override fun getInfo(element: PsiElement): Info? {
        val targetNode = getTargetNodeFromLeafNode(element) ?: return null
        val targetDescriptor = getNxTargetDescriptorFromTargetNode(targetNode) ?: return null

        return Info(
            AllIcons.RunConfigurations.TestState.Run,
            arrayOf(NxGraphFocusTaskAction(targetDescriptor))
        ) {
            "Focus target in graph"
        }
    }

    override fun producesAllPossibleConfigurations(file: PsiFile): Boolean {
        return false
    }
}
