package dev.nx.console.nxls.server

import kotlinx.serialization.Serializable

data class NxGeneratorsRequestOptions(val includeHidden: Boolean, val includeNgAdd: Boolean)
data class NxGeneratorsRequest(val options: NxGeneratorsRequestOptions = NxGeneratorsRequestOptions(
  includeHidden = false,
  includeNgAdd = false
)
)

@Serializable
data class NxGenerator(val name: String, val path: String, val data: NxGeneratorData)


@Serializable
data class NxGeneratorData(val collection: String, val name: String, val description: String, val type: String)
