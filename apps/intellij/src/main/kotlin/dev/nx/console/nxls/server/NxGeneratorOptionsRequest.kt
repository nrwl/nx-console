package dev.nx.console.nxls.server

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
    val type: String?
)
