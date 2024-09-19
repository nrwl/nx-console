package dev.nx.console.models

data class NxProject(
    val name: String,
    val root: String,
    val targets: Map<String, NxTarget>,
    val sourceRoot: String?,
    val projectType: String,
    val metadata: NxProjectMetadata?,
) {
    init {
        require(projectType == "application" || projectType == "library")
    }
}

data class NxProjectMetadata(
    val description: String?,
    val technologies: Array<String>?,
    val targetGroups: Map<String, Array<String>>?,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as NxProjectMetadata

        if (description != other.description) return false
        if (technologies != null) {
            if (other.technologies == null) return false
            if (!technologies.contentEquals(other.technologies)) return false
        } else if (other.technologies != null) return false
        if (targetGroups != other.targetGroups) return false

        return true
    }

    override fun hashCode(): Int {
        var result = description?.hashCode() ?: 0
        result = 31 * result + (technologies?.contentHashCode() ?: 0)
        result = 31 * result + targetGroups.hashCode()
        return result
    }
}
