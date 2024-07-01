package dev.nx.console.models

data class NxTarget(
    val executor: String,
    val configurations: Map<String, Any>?,
    val metadata: NxTargetMetadata?
) {}

data class NxTargetMetadata(
    val description: String?,
    val technologies: Array<String>?,
    val nonAtomizedTarget: String?
)
