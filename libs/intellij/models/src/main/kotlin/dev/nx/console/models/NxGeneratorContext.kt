package dev.nx.console.models

import kotlinx.serialization.Serializable

@Serializable()
data class NxGeneratorContext(
    val project: String?,
    val projectName: String?,
    val directory: String?,
    val normalizedDirectory: String?,
    val path: String?,
    val fixedFormValues: Map<String, String>?,
    val prefillValues: Map<String, String>?,
    val nxVersion: NxVersion?
)
