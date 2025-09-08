package dev.nx.console.nx_toolwindow.cloud_tree.actions

import com.intellij.ide.BrowserUtil
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import dev.nx.console.nx_toolwindow.cloud_tree.CIPESimpleNode
import dev.nx.console.nx_toolwindow.cloud_tree.CIPETreeNodeKey
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryService

class OpenCIPECommitAction : AnAction("Open Pull Request") {

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        val node = e.dataContext.getData(CIPETreeNodeKey)
        val isEnabled = node is CIPESimpleNode.CIPENode && !node.cipeInfo.commitUrl.isNullOrBlank()
        e.presentation.isEnabledAndVisible = isEnabled
    }

    override fun actionPerformed(e: AnActionEvent) {
        val node = e.dataContext.getData(CIPETreeNodeKey) as? CIPESimpleNode.CIPENode ?: return
        val project = e.project ?: return
        val commitUrl = node.cipeInfo.commitUrl

        if (commitUrl.isNullOrBlank()) return

        // Track telemetry
        TelemetryService.getInstance(project)
            .featureUsed(TelemetryEvent.CLOUD_VIEW_CIPE_COMMIT, mapOf("source" to "cloud-tree"))

        // Open commit/PR URL in browser
        BrowserUtil.browse(commitUrl)
    }
}