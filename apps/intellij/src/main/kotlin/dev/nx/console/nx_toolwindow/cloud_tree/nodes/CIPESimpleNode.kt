package dev.nx.console.nx_toolwindow.cloud_tree.nodes

import com.intellij.icons.AllIcons
import com.intellij.ui.AnimatedIcon
import com.intellij.ui.treeStructure.CachingSimpleNode
import dev.nx.console.models.AITaskFixUserAction
import dev.nx.console.models.AITaskFixVerificationStatus
import dev.nx.console.models.CIPEExecutionStatus
import javax.swing.Icon

sealed class CIPESimpleNode(parent: CIPESimpleNode?) : CachingSimpleNode(parent) {
    abstract val nodeId: String

    override fun buildChildren(): Array<out CIPESimpleNode> = emptyArray()

    class CIPERootNode : CIPESimpleNode(null) {
        override val nodeId = "cipe_root"

        init {
            icon = AllIcons.Vcs.History
        }

        override fun getName(): String = "Recent CI Pipeline Executions"
    }

    class CIPENode(
        val cipeId: String,
        val branch: String,
        val status: CIPEExecutionStatus,
        val timeAgo: String,
        val duration: String?,
        parent: CIPESimpleNode
    ) : CIPESimpleNode(parent) {
        override val nodeId = "cipe_$cipeId"

        init {
            icon = getStatusIcon(status)
            presentation.tooltip = "Pipeline execution on branch: $branch"
        }

        override fun getName(): String = buildString {
            append(branch)
            if (duration != null && status.isCompleted()) {
                append(" (")
                append(duration)
                append(")")
            }
            append(" - ")
            append(timeAgo)
        }

        private fun getStatusIcon(status: CIPEExecutionStatus): Icon =
            when (status) {
                CIPEExecutionStatus.SUCCEEDED -> AllIcons.RunConfigurations.TestPassed
                CIPEExecutionStatus.FAILED -> AllIcons.RunConfigurations.TestFailed
                CIPEExecutionStatus.IN_PROGRESS -> AnimatedIcon.Default()
                CIPEExecutionStatus.NOT_STARTED -> AllIcons.RunConfigurations.TestNotRan
                CIPEExecutionStatus.CANCELED -> AllIcons.RunConfigurations.TestTerminated
                CIPEExecutionStatus.TIMED_OUT -> AllIcons.RunConfigurations.TestError
            }
    }

    class RunGroupNode(val groupName: String, val hasAIFixes: Boolean, parent: CIPESimpleNode) :
        CIPESimpleNode(parent) {
        override val nodeId = "rungroup_$groupName"

        init {
            icon = AllIcons.Nodes.Folder
            presentation.tooltip = if (hasAIFixes) "$groupName (AI fixes available)" else groupName
        }

        override fun getName(): String = groupName
    }

    class RunNode(
        val runId: String,
        val command: String,
        val status: CIPEExecutionStatus,
        val duration: String?,
        val failedTaskCount: Int,
        parent: CIPESimpleNode
    ) : CIPESimpleNode(parent) {
        override val nodeId = "run_$runId"

        init {
            icon = getStatusIcon(status)
            presentation.tooltip = command
        }

        override fun getName(): String = buildString {
            append(command)
            if (duration != null && status.isCompleted()) {
                append(" (")
                append(duration)
                append(")")
            }
            if (failedTaskCount > 0) {
                append(" - ")
                append(failedTaskCount)
                append(" failed")
            }
        }

        private fun getStatusIcon(status: CIPEExecutionStatus): Icon =
            when (status) {
                CIPEExecutionStatus.SUCCEEDED -> AllIcons.RunConfigurations.TestPassed
                CIPEExecutionStatus.FAILED -> AllIcons.RunConfigurations.TestFailed
                CIPEExecutionStatus.IN_PROGRESS -> AnimatedIcon.Default()
                else -> AllIcons.RunConfigurations.TestNotRan
            }
    }

    class FailedTaskNode(
        val taskId: String,
        val projectName: String,
        val targetName: String,
        parent: CIPESimpleNode
    ) : CIPESimpleNode(parent) {
        override val nodeId = "task_$taskId"

        init {
            icon = AllIcons.RunConfigurations.TestError
            presentation.tooltip = "Failed task: $projectName:$targetName"
        }

        override fun getName(): String = "$projectName:$targetName"
    }

    class NxCloudFixNode(
        val fixId: String,
        val verificationStatus: AITaskFixVerificationStatus,
        val userAction: AITaskFixUserAction,
        parent: CIPESimpleNode
    ) : CIPESimpleNode(parent) {
        override val nodeId = "fix_$fixId"

        init {
            icon = getFixIcon()
            presentation.tooltip = getFixTooltip()
        }

        override fun getName(): String =
            when (verificationStatus) {
                AITaskFixVerificationStatus.NOT_STARTED -> "Generating fix..."
                AITaskFixVerificationStatus.IN_PROGRESS -> "Verifying fix..."
                AITaskFixVerificationStatus.COMPLETED ->
                    when (userAction) {
                        AITaskFixUserAction.APPLIED -> "Fix applied"
                        AITaskFixUserAction.APPLIED_LOCALLY -> "Fix applied locally"
                        AITaskFixUserAction.REJECTED -> "Fix rejected"
                        AITaskFixUserAction.NONE -> "Fix ready to apply"
                    }
                AITaskFixVerificationStatus.FAILED -> "Fix generation failed"
            }

        private fun getFixIcon(): Icon =
            when {
                userAction == AITaskFixUserAction.APPLIED ||
                    userAction == AITaskFixUserAction.APPLIED_LOCALLY -> AllIcons.Actions.Checked
                userAction == AITaskFixUserAction.REJECTED -> AllIcons.Actions.Cancel
                verificationStatus == AITaskFixVerificationStatus.IN_PROGRESS ->
                    AnimatedIcon.Default()
                verificationStatus == AITaskFixVerificationStatus.FAILED -> AllIcons.General.Error
                else -> AllIcons.Actions.QuickfixBulb
            }

        private fun getFixTooltip(): String =
            when (verificationStatus) {
                AITaskFixVerificationStatus.NOT_STARTED -> "Generating AI fix..."
                AITaskFixVerificationStatus.IN_PROGRESS -> "Verifying AI fix..."
                AITaskFixVerificationStatus.COMPLETED ->
                    when (userAction) {
                        AITaskFixUserAction.APPLIED -> "Fix has been applied"
                        AITaskFixUserAction.APPLIED_LOCALLY -> "Fix has been applied locally"
                        AITaskFixUserAction.REJECTED -> "Fix was rejected"
                        AITaskFixUserAction.NONE -> "Click to view and apply fix"
                    }
                AITaskFixVerificationStatus.FAILED -> "Failed to generate fix"
            }
    }

    class LabelNode(val labelText: String, parent: CIPESimpleNode) : CIPESimpleNode(parent) {
        override val nodeId = "label_${labelText.hashCode()}"

        init {
            icon = AllIcons.General.Information
        }

        override fun getName(): String = labelText
    }
}

// Extension function for CIPEExecutionStatus
fun CIPEExecutionStatus.isCompleted(): Boolean =
    this in
        setOf(
            CIPEExecutionStatus.SUCCEEDED,
            CIPEExecutionStatus.FAILED,
            CIPEExecutionStatus.CANCELED,
            CIPEExecutionStatus.TIMED_OUT
        )
