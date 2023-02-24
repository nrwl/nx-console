package dev.nx.console.nxls.server.requests

import dev.nx.console.models.NxGenerator

data class NxGetGeneratorContextFromPathRequest(
    val generator: NxGenerator? = null,
    val path: String
) {}
