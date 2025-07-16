package dev.nx.console.nx_toolwindow.cloud_tree

import com.intellij.notification.NotificationType
import com.intellij.openapi.project.Project
import com.intellij.ui.*
import com.intellij.ui.treeStructure.SimpleTree
import dev.nx.console.cloud.CloudFixUIService
import dev.nx.console.models.AITaskFixStatus
import dev.nx.console.models.AITaskFixUserAction
import dev.nx.console.models.CIPEExecutionStatus
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.Notifier
import java.awt.Color
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.JTree
import javax.swing.tree.DefaultMutableTreeNode

class CIPETree(private val project: Project) : SimpleTree() {
    init {
        isRootVisible = false
        setCellRenderer(CIPETreeCellRenderer())
        TreeUIHelper.getInstance().installTreeSpeedSearch(this)
        putClientProperty(AnimatedIcon.ANIMATION_IN_RENDERER_ALLOWED, true)
        addMouseListener(
            object : MouseAdapter() {
                override fun mouseClicked(e: MouseEvent) {
                    if (e.clickCount == 1) {
                        val path = getPathForLocation(e.x, e.y)
                        if (path != null) {
                            val lastNode = path.lastPathComponent as? DefaultMutableTreeNode
                            val userObject = lastNode?.userObject

                            if (userObject is CIPESimpleNode.NxCloudFixNode) {
                                handleAIFixClick(userObject)
                            }
                        }
                    }
                }
            }
        )
    }

    private fun handleAIFixClick(fixNode: CIPESimpleNode.NxCloudFixNode) {
        TelemetryService.getInstance(project)
            .featureUsed(TelemetryEvent.CLOUD_OPEN_FIX_DETAILS, mapOf("source" to "cipe_tree"))

        val runGroupId = fixNode.parent.parent.runGroup.runGroup
        val cipeId = findAncestor<CIPESimpleNode.CIPENode>(fixNode)?.cipeInfo?.ciPipelineExecutionId

        if (cipeId == null) {
            Notifier.notifyAnything(
                project,
                "Couldn't find CIPE for AI fix",
                NotificationType.ERROR
            )
            return
        }

        CloudFixUIService.getInstance(project).openCloudFixWebview(cipeId, runGroupId)
    }
}

class CIPETreeCellRenderer : ColoredTreeCellRenderer() {

    override fun customizeCellRenderer(
        tree: JTree,
        value: Any?,
        selected: Boolean,
        expanded: Boolean,
        leaf: Boolean,
        row: Int,
        hasFocus: Boolean
    ) {
        val userObject = (value as? DefaultMutableTreeNode)?.userObject
        if (userObject !is CIPESimpleNode) return

        // Set icon from the node
        icon = userObject.icon

        // Set text and attributes based on node type
        when (userObject) {
            is CIPESimpleNode.CIPERootNode -> {
                append(userObject.name, SimpleTextAttributes.REGULAR_BOLD_ATTRIBUTES)
            }
            is CIPESimpleNode.CIPENode -> {
                // Branch name
                append(userObject.cipeInfo.branch, SimpleTextAttributes.REGULAR_BOLD_ATTRIBUTES)

                // Duration if completed
                val duration = userObject.cipeInfo.getDurationString()
                if (duration != null && userObject.cipeInfo.status.isCompleted()) {
                    append(" ($duration)", SimpleTextAttributes.GRAY_ATTRIBUTES)
                }

                // Time ago
                append(
                    " - ${userObject.cipeInfo.getTimeAgoString()}",
                    SimpleTextAttributes.GRAY_ATTRIBUTES
                )

                // Status color indicator
                val statusColor = getStatusColor(userObject.cipeInfo.status)
                if (statusColor != null && !selected) {
                    background = statusColor
                }
            }
            is CIPESimpleNode.RunGroupNode -> {
                append(userObject.name, SimpleTextAttributes.REGULAR_ATTRIBUTES)
            }
            is CIPESimpleNode.RunNode -> {
                // Command
                append(userObject.run.command, SimpleTextAttributes.REGULAR_ATTRIBUTES)

                // Failed task count
                val failedTaskCount = userObject.run.numFailedTasks ?: 0
                if (failedTaskCount > 0) {
                    append(" - ", SimpleTextAttributes.GRAY_ATTRIBUTES)
                    append("$failedTaskCount failed", SimpleTextAttributes.ERROR_ATTRIBUTES)
                }
            }
            is CIPESimpleNode.FailedTaskNode -> {
                append(userObject.name, SimpleTextAttributes.ERROR_ATTRIBUTES)
            }
            is CIPESimpleNode.NxCloudFixNode -> {
                val userAction =
                    userObject.aiFix.userAction ?: dev.nx.console.models.AITaskFixUserAction.NONE
                val verificationStatus =
                    userObject.aiFix.verificationStatus
                        ?: dev.nx.console.models.AITaskFixStatus.NOT_STARTED
                val textAttributes =
                    when {
                        userAction.isApplied() -> SimpleTextAttributes.REGULAR_ITALIC_ATTRIBUTES
                        userAction.isRejected() -> SimpleTextAttributes.GRAY_ATTRIBUTES
                        verificationStatus.isFailed() -> SimpleTextAttributes.ERROR_ATTRIBUTES
                        else -> SimpleTextAttributes.REGULAR_ATTRIBUTES
                    }
                append(userObject.name, textAttributes)
            }
            is CIPESimpleNode.LabelNode -> {
                append(userObject.name, SimpleTextAttributes.GRAY_ITALIC_ATTRIBUTES)
            }
        }

        // Set tooltip if available
        toolTipText = userObject.presentation.tooltip
    }

    private fun getStatusColor(status: CIPEExecutionStatus): Color? {
        return when (status) {
            CIPEExecutionStatus.FAILED -> {
                val errorColor = JBColor.RED
                Color(errorColor.red, errorColor.green, errorColor.blue, 20)
            }
            CIPEExecutionStatus.SUCCEEDED -> {
                val successColor = JBColor.GREEN
                Color(successColor.red, successColor.green, successColor.blue, 20)
            }
            else -> null
        }
    }
}

private fun AITaskFixUserAction.isApplied(): Boolean =
    this == AITaskFixUserAction.APPLIED || this == AITaskFixUserAction.APPLIED_LOCALLY

private fun AITaskFixUserAction.isRejected(): Boolean = this == AITaskFixUserAction.REJECTED

private fun AITaskFixStatus.isFailed(): Boolean = this == AITaskFixStatus.FAILED
