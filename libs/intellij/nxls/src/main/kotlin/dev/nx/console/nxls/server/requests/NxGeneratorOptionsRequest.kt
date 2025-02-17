package dev.nx.console.nxls.server.requests

data class NxGeneratorOptionsRequestOptions(
    val collection: String,
    val name: String,
    val path: String
)

class NxGeneratorOptionsRequest(val options: NxGeneratorOptionsRequestOptions)
