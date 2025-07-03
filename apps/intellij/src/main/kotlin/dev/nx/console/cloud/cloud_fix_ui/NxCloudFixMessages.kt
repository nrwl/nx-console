package dev.nx.console.cloud.cloud_fix_ui

import dev.nx.console.models.CIPEInfo
import dev.nx.console.models.CIPERunGroup
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
sealed class NxCloudFixMessage {
    @Serializable @SerialName("apply") object Apply : NxCloudFixMessage()

    @Serializable @SerialName("apply-locally") object ApplyLocally : NxCloudFixMessage()

    @Serializable @SerialName("reject") object Reject : NxCloudFixMessage()

    @Serializable @SerialName("show-diff") object ShowDiff : NxCloudFixMessage()
}

@Serializable
data class NxCloudFixDetails(
    val cipe: CIPEInfo,
    val runGroup: CIPERunGroup,
    val terminalOutput: String? = null
)
