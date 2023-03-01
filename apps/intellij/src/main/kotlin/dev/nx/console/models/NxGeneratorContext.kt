package dev.nx.console.models

import kotlinx.serialization.Serializable

@Serializable()
data class NxGeneratorContext(
    val project: String?,
    val projectName: String?,
    val directory: String?,
    val path: String?
)
