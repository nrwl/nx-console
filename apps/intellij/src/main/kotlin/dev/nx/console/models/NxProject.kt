package dev.nx.console.models

data class NxProject(
    val name: String,
    val root: String,
    val targets: Map<String, NxTarget>,
    val sourceRoot: String?,
    val projectType: String,
) {
    init {
        require(projectType == "application" || projectType == "library")
    }
}
