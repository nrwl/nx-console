package dev.nx.console.cloud.cloud_fix_ui

import dev.nx.console.models.CIPEInfo
import dev.nx.console.models.CIPERunGroup
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
sealed class NxCloudFixMessage {
    @Serializable
    @SerialName("apply")
    data class Apply(val commitMessage: String? = null) : NxCloudFixMessage()

    @Serializable @SerialName("apply-locally") data object ApplyLocally : NxCloudFixMessage()

    @Serializable @SerialName("reject") data object Reject : NxCloudFixMessage()

    @Serializable @SerialName("show-diff") data object ShowDiff : NxCloudFixMessage()

    @Serializable
    @SerialName("open-external-link")
    data class OpenExternalLink(val url: String) : NxCloudFixMessage()
}

@Serializable
data class NxCloudFixDetails(
    val cipe: CIPEInfo,
    val runGroup: CIPERunGroup,
    val terminalOutput: String? = null,
    val hasUncommittedChanges: Boolean? = null
)
