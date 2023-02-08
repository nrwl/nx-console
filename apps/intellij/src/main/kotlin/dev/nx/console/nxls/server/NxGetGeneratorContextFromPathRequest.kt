package dev.nx.console.nxls.server

import kotlinx.serialization.Serializable

data class NxGetGeneratorContextFromPathRequest(val generator: NxGenerator, val path: String) {}

@Serializable()
data class NxGeneratorContext(
    val project: String?,
    val projectName: String?,
    val directory: String?,
    val path: String?
)
