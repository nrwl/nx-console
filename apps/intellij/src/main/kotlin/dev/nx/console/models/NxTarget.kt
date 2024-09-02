package dev.nx.console.models

import kotlinx.serialization.Serializable

data class NxTarget(
    val executor: String,
    val configurations: Map<String, Any>?,
    val metadata: NxTargetMetadata?,
) {}

@Serializable()
data class NxTargetMetadata(
    val description: String?,
    val technologies: Array<String>?,
    val nonAtomizedTarget: String?,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as NxTargetMetadata

        if (description != other.description) return false
        if (technologies != null) {
            if (other.technologies == null) return false
            if (!technologies.contentEquals(other.technologies)) return false
        } else if (other.technologies != null) return false
        if (nonAtomizedTarget != other.nonAtomizedTarget) return false

        return true
    }

    override fun hashCode(): Int {
        var result = description?.hashCode() ?: 0
        result = 31 * result + (technologies?.contentHashCode() ?: 0)
        result = 31 * result + (nonAtomizedTarget?.hashCode() ?: 0)
        return result
    }
}
