package dev.nx.console.models

import com.google.gson.annotations.SerializedName
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class NxCloudAuthHeaders(
    @SerializedName("Nx-Cloud-Id") @SerialName("Nx-Cloud-Id") val nxCloudId: String? = null,
    @SerializedName("Nx-Cloud-Personal-Access-Token")
    @SerialName("Nx-Cloud-Personal-Access-Token")
    val nxCloudPersonalAccessToken: String? = null,
    @SerializedName("Authorization") @SerialName("Authorization") val authorization: String? = null,
)
