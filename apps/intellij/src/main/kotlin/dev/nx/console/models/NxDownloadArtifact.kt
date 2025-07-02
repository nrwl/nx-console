package dev.nx.console.models

data class NxDownloadAndExtractArtifactRequest(
    val artifactUrl: String
)

data class NxDownloadAndExtractArtifactResponse(
    val content: String? = null,
    val error: String? = null
)