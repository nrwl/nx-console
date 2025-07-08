package dev.nx.console.nx_toolwindow.cloud_tree

import com.intellij.icons.AllIcons
import com.intellij.ui.AnimatedIcon
import com.intellij.ui.treeStructure.CachingSimpleNode
import dev.nx.console.models.*
import javax.swing.Icon

sealed class CIPESimpleNode(parent: CIPESimpleNode?) : CachingSimpleNode(parent) {
    abstract val nodeId: String

    val idPath: List<String> by lazy {
        when (parent) {
            is CIPESimpleNode -> parent.idPath + nodeId
            else -> listOf(nodeId)
        }
    }

    override fun buildChildren(): Array<out CIPESimpleNode> = emptyArray()

    class CIPERootNode : CIPESimpleNode(null) {
        override val nodeId = "cipe_root"

        init {
            icon = AllIcons.Vcs.History
        }

        override fun getName(): String = "Recent CI Pipeline Executions"
    }

    class CIPENode(val cipeInfo: CIPEInfo, parent: CIPESimpleNode) : CIPESimpleNode(parent) {
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
                CIPEExecutionStatus.FAILED -> AllIcons.RunConfigurations.TestError
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
            val displayName = runGroup.ciExecutionEnv.ifEmpty { runGroup.runGroup }
            presentation.tooltip = displayName
        }

        override fun getName(): String = runGroup.ciExecutionEnv.ifEmpty { runGroup.runGroup }
    }

    class RunNode(val run: CIPERun, parent: CIPESimpleNode) : CIPESimpleNode(parent) {
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
                CIPEExecutionStatus.FAILED -> AllIcons.RunConfigurations.TestError
                CIPEExecutionStatus.IN_PROGRESS -> AnimatedIcon.Default()
                else -> AllIcons.RunConfigurations.TestNotRan
            }
    }

    class FailedTaskNode(val taskName: String, parent: CIPESimpleNode) : CIPESimpleNode(parent) {
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

    class NxCloudFixNode(val aiFix: NxAiFix, parent: CIPESimpleNode) : CIPESimpleNode(parent) {
        override val nodeId = "fix_${aiFix.aiFixId}"

        init {
            icon = getFixIcon()
            presentation.tooltip = getFixTooltip()
        }

        override fun getName(): String {
            val userAction = aiFix.userAction ?: AITaskFixUserAction.NONE
            val fixStatus = aiFix.suggestedFixStatus ?: AITaskFixVerificationStatus.NOT_STARTED
            val verificationStatus =
                aiFix.verificationStatus ?: AITaskFixVerificationStatus.NOT_STARTED
            val hasSuggestedFix = aiFix.suggestedFix != null

            // User action takes precedence
            if (
                userAction == AITaskFixUserAction.APPLIED ||
                    userAction == AITaskFixUserAction.APPLIED_LOCALLY
            ) {
                return "Nx Cloud has applied the fix"
            }
            if (userAction == AITaskFixUserAction.REJECTED) {
                return "Fix rejected by user"
            }

            // If a fix exists, check verification status
            if (hasSuggestedFix) {
                return when (verificationStatus) {
                    AITaskFixVerificationStatus.NOT_STARTED -> "Nx Cloud AI fix ready to verify"
                    AITaskFixVerificationStatus.IN_PROGRESS -> "Nx Cloud is verifying the AI fix"
                    AITaskFixVerificationStatus.COMPLETED -> "Nx Cloud AI verified a fix"
                    AITaskFixVerificationStatus.FAILED -> "Failed Nx Cloud AI fix verification"
                    else -> "Nx Cloud AI fix ready to verify"
                }
            }

            // No fix exists yet, check generation status
            return when (fixStatus) {
                AITaskFixVerificationStatus.NOT_STARTED ->
                    "Nx Cloud AI is preparing to generate a fix"
                AITaskFixVerificationStatus.IN_PROGRESS -> "Nx Cloud AI is creating a fix"
                AITaskFixVerificationStatus.NOT_EXECUTABLE ->
                    "Nx Cloud AI is not able to generate a fix"
                AITaskFixVerificationStatus.COMPLETED -> "Nx Cloud AI has generated a fix"
                AITaskFixVerificationStatus.FAILED -> "Failed Nx Cloud AI fix generation"
                else -> "Nx Cloud AI is preparing to generate a fix"
            }
        }

        private fun getFixIcon(): Icon {
            val userAction = aiFix.userAction ?: AITaskFixUserAction.NONE
            val fixStatus = aiFix.suggestedFixStatus ?: AITaskFixVerificationStatus.NOT_STARTED
            val verificationStatus =
                aiFix.verificationStatus ?: AITaskFixVerificationStatus.NOT_STARTED
            val hasSuggestedFix = aiFix.suggestedFix != null

            // User action takes precedence
            if (
                userAction == AITaskFixUserAction.APPLIED ||
                    userAction == AITaskFixUserAction.APPLIED_LOCALLY
            ) {
                return AllIcons.Actions.Checked // Green check mark
            }
            if (userAction == AITaskFixUserAction.REJECTED) {
                return AllIcons.Actions.Cancel // Red circle slash
            }

            // If a fix exists, check verification status
            if (hasSuggestedFix) {
                return when (verificationStatus) {
                    AITaskFixVerificationStatus.NOT_STARTED ->
                        AllIcons.General.BalloonInformation // Info blue wrench
                    AITaskFixVerificationStatus.IN_PROGRESS ->
                        AnimatedIcon.Default() // Loading spinner
                    AITaskFixVerificationStatus.COMPLETED ->
                        AllIcons.Actions.Commit // Green verified badge
                    AITaskFixVerificationStatus.FAILED ->
                        AllIcons.General.BalloonWarning // Yellow/orange warning
                    else -> AllIcons.General.BalloonInformation
                }
            }

            // No fix exists yet, check generation status
            return when (fixStatus) {
                AITaskFixVerificationStatus.NOT_STARTED -> AllIcons.General.Information // Info
                AITaskFixVerificationStatus.IN_PROGRESS -> AnimatedIcon.Default() // Loading spinner
                AITaskFixVerificationStatus.NOT_EXECUTABLE ->
                    AllIcons.Actions.Cancel // Circle slash
                AITaskFixVerificationStatus.COMPLETED ->
                    AllIcons.Actions.Checked // Green check mark
                AITaskFixVerificationStatus.FAILED -> AllIcons.General.Error // Red error
                else -> AllIcons.General.Information
            }
        }

        private fun getFixTooltip(): String {
            // Simply return the same text as getName() for consistency with VSCode
            return getName()
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
