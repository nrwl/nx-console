package dev.nx.console.nx_toolwindow.cloud_tree

import com.intellij.ui.ColoredTreeCellRenderer
import com.intellij.ui.JBColor
import com.intellij.ui.SimpleTextAttributes
import dev.nx.console.models.CIPEExecutionStatus
import dev.nx.console.nx_toolwindow.cloud_tree.nodes.CIPESimpleNode
import java.awt.Color
import javax.swing.JTree
import javax.swing.tree.DefaultMutableTreeNode

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
                append(userObject.branch, SimpleTextAttributes.REGULAR_BOLD_ATTRIBUTES)

                // Duration if completed
                if (userObject.duration != null && userObject.status.isCompleted()) {
                    append(" (${userObject.duration})", SimpleTextAttributes.GRAY_ATTRIBUTES)
                }

                // Time ago
                append(" - ${userObject.timeAgo}", SimpleTextAttributes.GRAY_ATTRIBUTES)

                // Status color indicator
                val statusColor = getStatusColor(userObject.status)
                if (statusColor != null && !selected) {
                    background = statusColor
                }
            }
            is CIPESimpleNode.RunGroupNode -> {
                append(userObject.name, SimpleTextAttributes.REGULAR_ATTRIBUTES)
                if (userObject.hasAIFixes) {
                    append(" ", SimpleTextAttributes.REGULAR_ATTRIBUTES)
                    append("(AI fixes available)", SimpleTextAttributes.GRAY_ITALIC_ATTRIBUTES)
                }
            }
            is CIPESimpleNode.RunNode -> {
                // Command
                append(userObject.command, SimpleTextAttributes.REGULAR_ATTRIBUTES)

                // Duration if available
                if (userObject.duration != null && userObject.status.isCompleted()) {
                    append(" (${userObject.duration})", SimpleTextAttributes.GRAY_ATTRIBUTES)
                }

                // Failed task count
                if (userObject.failedTaskCount > 0) {
                    append(" - ", SimpleTextAttributes.GRAY_ATTRIBUTES)
                    append(
                        "${userObject.failedTaskCount} failed",
                        SimpleTextAttributes.ERROR_ATTRIBUTES
                    )
                }
            }
            is CIPESimpleNode.FailedTaskNode -> {
                append(userObject.name, SimpleTextAttributes.ERROR_ATTRIBUTES)
            }
            is CIPESimpleNode.NxCloudFixNode -> {
                val textAttributes =
                    when {
                        userObject.userAction.isApplied() ->
                            SimpleTextAttributes.REGULAR_ITALIC_ATTRIBUTES
                        userObject.userAction.isRejected() -> SimpleTextAttributes.GRAY_ATTRIBUTES
                        userObject.verificationStatus.isFailed() ->
                            SimpleTextAttributes.ERROR_ATTRIBUTES
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

// Extension functions for status checks
private fun CIPEExecutionStatus.isCompleted(): Boolean =
    this in
        setOf(
            CIPEExecutionStatus.SUCCEEDED,
            CIPEExecutionStatus.FAILED,
            CIPEExecutionStatus.CANCELED,
            CIPEExecutionStatus.TIMED_OUT
        )

private fun dev.nx.console.models.AITaskFixUserAction.isApplied(): Boolean =
    this == dev.nx.console.models.AITaskFixUserAction.APPLIED ||
        this == dev.nx.console.models.AITaskFixUserAction.APPLIED_LOCALLY

private fun dev.nx.console.models.AITaskFixUserAction.isRejected(): Boolean =
    this == dev.nx.console.models.AITaskFixUserAction.REJECTED

private fun dev.nx.console.models.AITaskFixVerificationStatus.isFailed(): Boolean =
    this == dev.nx.console.models.AITaskFixVerificationStatus.FAILED
