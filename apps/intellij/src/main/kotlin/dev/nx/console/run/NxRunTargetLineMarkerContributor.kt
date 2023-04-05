package dev.nx.console.run

import com.intellij.execution.lineMarker.ExecutorAction
import com.intellij.execution.lineMarker.RunLineMarkerContributor
import com.intellij.icons.AllIcons.RunConfigurations
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import dev.nx.console.utils.getTargetNodeFromLeafNode
import dev.nx.console.utils.isTargetNodeInsideProjectJson

class NxRunTargetLineMarkerContributor : RunLineMarkerContributor() {
    override fun getInfo(element: PsiElement): Info? {
        val targetNode = getTargetNodeFromLeafNode(element) ?: return null
        if (!isTargetNodeInsideProjectJson(targetNode)) return null

        return Info(RunConfigurations.TestState.Run, ExecutorAction.getActions()) { "Run Target" }
    }

    override fun producesAllPossibleConfigurations(file: PsiFile): Boolean {
        return false
    }
}
