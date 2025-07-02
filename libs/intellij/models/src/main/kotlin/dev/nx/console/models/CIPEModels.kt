package dev.nx.console.models

import kotlinx.serialization.*

@Serializable
data class CIPEInfo(
    val ciPipelineExecutionId: String,
    val branch: String,
    val status: CIPEExecutionStatus,
    val createdAt: Long,
    val completedAt: Long?,
    val commitTitle: String?,
    val commitUrl: String?,
    val author: String? = null,
    val authorAvatarUrl: String? = null,
    val cipeUrl: String,
    val runGroups: List<CIPERunGroup>
)

@Serializable
data class CIPERunGroup(
    val ciExecutionEnv: String,
    val runGroup: String,
    val createdAt: Long,
    val completedAt: Long?,
    val status: CIPEExecutionStatus,
    val runs: List<CIPERun>,
    val aiFix: NxAiFix? = null
)

@Serializable
data class CIPERun(
    val linkId: String? = null,
    val executionId: String? = null,
    val command: String,
    val status: CIPEExecutionStatus? = null,
    val failedTasks: List<String>? = null,
    val numFailedTasks: Int? = null,
    val numTasks: Int? = null,
    val runUrl: String
)

data class CIPEInfoError(val message: String, val type: CIPEInfoErrorType)

enum class CIPEInfoErrorType {
    authentication,
    network,
    other
}

@Serializable
enum class CIPEExecutionStatus {
    NOT_STARTED,
    IN_PROGRESS,
    SUCCEEDED,
    FAILED,
    CANCELED,
    TIMED_OUT
}

data class CIPEDataResponse(
    val info: List<CIPEInfo>? = null,
    val error: CIPEInfoError? = null,
    val workspaceUrl: String? = null
)

@Serializable
data class NxAiFix(
    val aiFixId: String,
    val taskIds: List<String>,
    val terminalLogsUrls: Map<String, String>,
    val suggestedFix: String? = null,
    val suggestedFixDescription: String? = null,
    val verificationStatus: AITaskFixVerificationStatus? = null,
    val userAction: AITaskFixUserAction? = null
)

@Serializable
enum class AITaskFixVerificationStatus {
    NOT_STARTED,
    IN_PROGRESS,
    COMPLETED,
    FAILED
}

@Serializable
enum class AITaskFixUserAction {
    NONE,
    APPLIED,
    REJECTED,
    APPLIED_LOCALLY
}
