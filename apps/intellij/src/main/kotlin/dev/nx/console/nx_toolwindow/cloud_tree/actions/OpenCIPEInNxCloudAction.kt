package dev.nx.console.nx_toolwindow.cloud_tree.actions

import com.intellij.ide.BrowserUtil
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import dev.nx.console.nx_toolwindow.cloud_tree.CIPESimpleNode
import dev.nx.console.nx_toolwindow.cloud_tree.CIPETreeNodeKey
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryService

class OpenCIPEInNxCloudAction : AnAction("Open in Nx Cloud") {

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        val node = e.dataContext.getData(CIPETreeNodeKey)
        e.presentation.isEnabledAndVisible = node is CIPESimpleNode.CIPENode
    }

    override fun actionPerformed(e: AnActionEvent) {
        val node = e.dataContext.getData(CIPETreeNodeKey) as? CIPESimpleNode.CIPENode ?: return
        val project = e.project ?: return

        // Track telemetry
        TelemetryService.getInstance(project)
            .featureUsed(TelemetryEvent.CLOUD_VIEW_CIPE, mapOf("source" to "cloud-tree"))

        // Open CIPE URL in browser
        BrowserUtil.browse(node.cipeInfo.cipeUrl)
    }
}
