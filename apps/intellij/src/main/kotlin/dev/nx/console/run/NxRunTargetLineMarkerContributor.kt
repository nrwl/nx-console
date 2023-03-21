package dev.nx.console.run

import com.intellij.execution.lineMarker.ExecutorAction
import com.intellij.execution.lineMarker.RunLineMarkerContributor
import com.intellij.icons.AllIcons.RunConfigurations
import com.intellij.psi.PsiElement
import dev.nx.console.utils.isTargetNodeInsideProjectJson

class NxRunTargetLineMarkerContributor : RunLineMarkerContributor() {
    override fun getInfo(element: PsiElement): Info? {
        if (!isTargetNodeInsideProjectJson(element)) return null

        return Info(RunConfigurations.TestState.Run, ExecutorAction.getActions()) { "Run Target" }
    }
}
