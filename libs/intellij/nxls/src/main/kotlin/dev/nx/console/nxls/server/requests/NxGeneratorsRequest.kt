package dev.nx.console.nxls.server.requests

data class NxGeneratorsRequestOptions(val includeHidden: Boolean, val includeNgAdd: Boolean)

data class NxGeneratorsRequest(
    val options: NxGeneratorsRequestOptions =
        NxGeneratorsRequestOptions(includeHidden = false, includeNgAdd = false)
)
