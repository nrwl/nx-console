package dev.nx.console.models

import com.google.gson.annotations.SerializedName
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

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
    @SerializedName("x-priority") @SerialName("x-priority") val priority: String?,
    val default: String?
)
