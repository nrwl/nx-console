package dev.nx.console.nxls.server

import com.google.gson.annotations.SerializedName
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

data class NxGeneratorOptionsRequestOptions(
    val collection: String,
    val name: String,
    val path: String
)

class NxGeneratorOptionsRequest(val options: NxGeneratorOptionsRequestOptions)

@Serializable
data class NxGeneratorOption(
    val name: String,
    val isRequired: Boolean?,
    val deprecated: Boolean?,
    val description: String?,
    val type: String?,
    val enum: List<String>?,
    val items: List<String>?,
    // LSP4J uses GSON for serialization, while we use kotlinx.serialization - this is why we have
    // to do double annotations
    @SerializedName("x-priority") @SerialName("x-priority") val priority: String?
)
