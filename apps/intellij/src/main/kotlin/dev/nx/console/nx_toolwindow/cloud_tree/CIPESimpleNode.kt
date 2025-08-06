package dev.nx.console.nx_toolwindow.cloud_tree

import com.intellij.icons.AllIcons
import com.intellij.ui.AnimatedIcon
import com.intellij.ui.treeStructure.CachingSimpleNode
import dev.nx.console.models.*
import javax.swing.Icon

sealed class CIPESimpleNode(parent: CIPESimpleNode?) : CachingSimpleNode(parent) {
    abstract val nodeId: String
    abstract val parent: CIPESimpleNode?

    val idPath: List<String> by lazy {
        when (parent) {
            is CIPESimpleNode -> parent.idPath + nodeId
            else -> listOf(nodeId)
        }
    }

    override fun buildChildren(): Array<out CIPESimpleNode> = emptyArray()

    class CIPERootNode : CIPESimpleNode(null) {
        override val nodeId = "cipe_root"
        override val parent: CIPESimpleNode? = null

        init {
            icon = AllIcons.Vcs.History
        }

        override fun getName(): String = "Recent CI Pipeline Executions"
    }

    class CIPENode(val cipeInfo: CIPEInfo, override val parent: CIPESimpleNode) :
        CIPESimpleNode(parent) {
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
                CIPEExecutionStatus.IN_PROGRESS -> AnimatedIcon.Default.INSTANCE
                CIPEExecutionStatus.NOT_STARTED -> AllIcons.RunConfigurations.TestNotRan
                CIPEExecutionStatus.CANCELED -> AllIcons.RunConfigurations.TestTerminated
                CIPEExecutionStatus.TIMED_OUT -> AllIcons.RunConfigurations.TestError
            }
    }

    class RunGroupNode(val runGroup: CIPERunGroup, override val parent: CIPESimpleNode) :
        CIPESimpleNode(parent) {
        override val nodeId = "rungroup_${runGroup.runGroup}"

        init {
            icon = AllIcons.Nodes.Folder
            val displayName = runGroup.ciExecutionEnv.ifEmpty { runGroup.runGroup }
            presentation.tooltip = displayName
        }

        override fun getName(): String = runGroup.ciExecutionEnv.ifEmpty { runGroup.runGroup }
    }

    class RunNode(
        val run: CIPERun,
        val runGroup: CIPERunGroup,
        override val parent: CIPESimpleNode
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
                CIPEExecutionStatus.FAILED -> AllIcons.RunConfigurations.TestError
                CIPEExecutionStatus.IN_PROGRESS -> AnimatedIcon.Default()
                else -> AllIcons.RunConfigurations.TestNotRan
            }
    }

    class FailedTaskNode(val taskName: String, override val parent: RunNode) :
        CIPESimpleNode(parent) {
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
        override val parent: CIPESimpleNode,
    ) : CIPESimpleNode(parent) {
        override val nodeId = "fix_${aiFix.aiFixId}"

        override fun isAutoExpandNode(): Boolean {
            return true
        }

        init {
            icon = getFixIcon()
            presentation.tooltip = getFixTooltip()
        }

        fun getRunGroup(): CIPERunGroup? {
            return when (val parent = this.parent) {
                is RunGroupNode -> parent.runGroup
                is CIPENode -> {
                    // Single run group case - get the first (and only) run group
                    parent.cipeInfo.runGroups.firstOrNull()
                }
                else -> null
            }
        }

        override fun getName(): String {
            val userAction = aiFix.userAction ?: AITaskFixUserAction.NONE
            val fixStatus = aiFix.suggestedFixStatus ?: AITaskFixStatus.NOT_STARTED
            val verificationStatus = aiFix.verificationStatus ?: AITaskFixStatus.NOT_STARTED
            val hasSuggestedFix = aiFix.suggestedFix != null

            return run {
                // User action takes precedence
                if (
                    userAction == AITaskFixUserAction.APPLIED ||
                        userAction == AITaskFixUserAction.APPLIED_LOCALLY
                ) {
                    "Nx Cloud has applied the fix"
                } else if (userAction == AITaskFixUserAction.REJECTED) {
                    "Fix rejected by user"
                } else if (hasSuggestedFix) {
                    // If a fix exists, check verification status
                    when (verificationStatus) {
                        AITaskFixStatus.NOT_STARTED -> "Nx Cloud AI fix ready to verify"
                        AITaskFixStatus.IN_PROGRESS -> "Nx Cloud is verifying the AI fix"
                        AITaskFixStatus.COMPLETED -> "Nx Cloud verified a fix"
                        AITaskFixStatus.FAILED -> "Failed Nx Cloud AI fix verification"
                        else -> "Nx Cloud AI fix ready to verify"
                    }
                } else {
                    // No fix exists yet, check generation status
                    when (fixStatus) {
                        AITaskFixStatus.NOT_STARTED -> "Nx Cloud AI is preparing to generate a fix"
                        AITaskFixStatus.IN_PROGRESS -> "Nx Cloud AI is creating a fix"
                        AITaskFixStatus.NOT_EXECUTABLE ->
                            "Nx Cloud AI is not able to generate a fix"
                        AITaskFixStatus.COMPLETED -> "Nx Cloud AI has generated a fix"
                        AITaskFixStatus.FAILED -> "Failed Nx Cloud AI fix generation"
                        else -> "Nx Cloud AI is preparing to generate a fix"
                    }
                }
            }
        }

        private fun getFixIcon(): Icon {
            val userAction = aiFix.userAction ?: AITaskFixUserAction.NONE
            val fixStatus = aiFix.suggestedFixStatus ?: AITaskFixStatus.NOT_STARTED
            val verificationStatus = aiFix.verificationStatus ?: AITaskFixStatus.NOT_STARTED
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
                    AITaskFixStatus.NOT_STARTED ->
                        AllIcons.General.BalloonInformation // Info blue wrench
                    AITaskFixStatus.IN_PROGRESS -> AnimatedIcon.Default() // Loading spinner
                    AITaskFixStatus.COMPLETED -> AllIcons.Actions.Commit // Green verified badge
                    AITaskFixStatus.FAILED ->
                        AllIcons.General.BalloonWarning // Yellow/orange warning
                    else -> AllIcons.General.BalloonInformation
                }
            }

            // No fix exists yet, check generation status
            return when (fixStatus) {
                AITaskFixStatus.NOT_STARTED -> AllIcons.General.Information // Info
                AITaskFixStatus.IN_PROGRESS -> AnimatedIcon.Default() // Loading spinner
                AITaskFixStatus.NOT_EXECUTABLE -> AllIcons.Actions.Cancel // Circle slash
                AITaskFixStatus.COMPLETED -> AllIcons.Actions.Checked // Green check mark
                AITaskFixStatus.FAILED -> AllIcons.General.Error // Red error
                else -> AllIcons.General.Information
            }
        }

        private fun getFixTooltip(): String {
            // Simply return the same text as getName() for consistency with VSCode
            return getName()
        }
    }

    class LabelNode(val labelText: String, override val parent: CIPESimpleNode) :
        CIPESimpleNode(parent) {
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
