package dev.nx.console.models

import kotlinx.serialization.Serializable

@Serializable()
data class NxVersion(val minor: Int, val major: Int, val full: String) {
    public fun gte(other: NxVersion): Boolean {
        if (this.major > other.major) {
            return true
        } else if (this.major == other.major) {
            return this.minor >= other.minor
        }
        return false
    }
}
