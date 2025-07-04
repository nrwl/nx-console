package dev.nx.console.nx_toolwindow.cloud_tree.nodes

import com.intellij.icons.AllIcons
import com.intellij.ui.AnimatedIcon
import com.intellij.ui.treeStructure.CachingSimpleNode
import dev.nx.console.models.*
import dev.nx.console.nx_toolwindow.cloud_tree.models.getDurationString
import dev.nx.console.nx_toolwindow.cloud_tree.models.getTimeAgoString
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
        val cipeInfo: CIPEInfo,
        parent: CIPESimpleNode
    ) : CIPESimpleNode(parent) {
        override val nodeId = "cipe_${cipeInfo.ciPipelineExecutionId}"

        init {
            icon = getStatusIcon(cipeInfo.status)
            presentation.tooltip = "Pipeline execution on branch: ${cipeInfo.branch}"
        }

        override fun getName(): String = buildString {
            append(cipeInfo.branch)
            val duration = cipeInfo.getDurationString()
            if (duration != null && cipeInfo.status.isCompleted()) {
                append(" (")
                append(duration)
                append(")")
            }
            append(" - ")
            append(cipeInfo.getTimeAgoString())
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

    class RunGroupNode(val runGroup: CIPERunGroup, parent: CIPESimpleNode) :
        CIPESimpleNode(parent) {
        override val nodeId = "rungroup_${runGroup.runGroup}"

        init {
            icon = AllIcons.Nodes.Folder
            val hasAIFixes = runGroup.aiFix != null
            val displayName = runGroup.ciExecutionEnv.ifEmpty { runGroup.runGroup }
            presentation.tooltip = if (hasAIFixes) "$displayName (AI fixes available)" else displayName
        }

        override fun getName(): String = runGroup.ciExecutionEnv.ifEmpty { runGroup.runGroup }
    }

    class RunNode(
        val run: CIPERun,
        parent: CIPESimpleNode
    ) : CIPESimpleNode(parent) {
        override val nodeId = "run_${run.linkId ?: run.executionId ?: "unknown"}"

        init {
            icon = getStatusIcon(run.status ?: CIPEExecutionStatus.NOT_STARTED)
            presentation.tooltip = run.command
        }

        override fun getName(): String = buildString {
            append(run.command)
            val failedTaskCount = run.numFailedTasks ?: 0
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
        val taskName: String,
        parent: CIPESimpleNode
    ) : CIPESimpleNode(parent) {
        override val nodeId = "task_$taskName"
        
        val projectName: String
        val targetName: String
        
        init {
            val parts = taskName.split(":")
            projectName = parts.getOrNull(0) ?: taskName
            targetName = parts.getOrNull(1) ?: ""
            
            icon = AllIcons.RunConfigurations.TestError
            presentation.tooltip = "Failed task: $taskName"
        }

        override fun getName(): String = taskName
    }

    class NxCloudFixNode(
        val aiFix: NxAiFix,
        parent: CIPESimpleNode
    ) : CIPESimpleNode(parent) {
        override val nodeId = "fix_${aiFix.aiFixId}"

        init {
            icon = getFixIcon()
            presentation.tooltip = getFixTooltip()
        }

        override fun getName(): String =
            when (aiFix.verificationStatus ?: AITaskFixVerificationStatus.NOT_STARTED) {
                AITaskFixVerificationStatus.NOT_STARTED -> "Generating fix..."
                AITaskFixVerificationStatus.IN_PROGRESS -> "Verifying fix..."
                AITaskFixVerificationStatus.COMPLETED ->
                    when (aiFix.userAction ?: AITaskFixUserAction.NONE) {
                        AITaskFixUserAction.APPLIED -> "Fix applied"
                        AITaskFixUserAction.APPLIED_LOCALLY -> "Fix applied locally"
                        AITaskFixUserAction.REJECTED -> "Fix rejected"
                        AITaskFixUserAction.NONE -> "Fix ready to apply"
                    }
                AITaskFixVerificationStatus.FAILED -> "Fix generation failed"
            }

        private fun getFixIcon(): Icon {
            val userAction = aiFix.userAction ?: AITaskFixUserAction.NONE
            val verificationStatus = aiFix.verificationStatus ?: AITaskFixVerificationStatus.NOT_STARTED
            return when {
                userAction == AITaskFixUserAction.APPLIED ||
                    userAction == AITaskFixUserAction.APPLIED_LOCALLY -> AllIcons.Actions.Checked
                userAction == AITaskFixUserAction.REJECTED -> AllIcons.Actions.Cancel
                verificationStatus == AITaskFixVerificationStatus.IN_PROGRESS ->
                    AnimatedIcon.Default()
                verificationStatus == AITaskFixVerificationStatus.FAILED -> AllIcons.General.Error
                else -> AllIcons.Actions.QuickfixBulb
            }
        }

        private fun getFixTooltip(): String {
            val userAction = aiFix.userAction ?: AITaskFixUserAction.NONE
            val verificationStatus = aiFix.verificationStatus ?: AITaskFixVerificationStatus.NOT_STARTED
            return when (verificationStatus) {
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
