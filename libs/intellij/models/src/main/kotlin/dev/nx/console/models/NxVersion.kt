package dev.nx.console.models

import kotlinx.serialization.Serializable
import org.semver4j.Semver

@Serializable()
data class NxVersion(val minor: Int, val major: Int, val full: String, val patch: Int) {
    fun gte(other: NxVersion): Boolean {
        if (this.full.startsWith("0.0.0-pr-")) {
            return true
        }
        if (other.full.startsWith("0.0.0-pr-")) {
            return false
        }
        val semVerThis = Semver.parse(this.full)
        val semVerOther = Semver.parse(other.full)
        if (semVerThis != null && semVerOther != null) {
            return semVerThis >= semVerOther
        }
        if (this.major > other.major) {
            return true
        } else if (this.major == other.major) {
            if (this.minor > other.minor) {
                return true
            } else if (this.minor == other.minor) {
                return this.patch >= other.patch
            }
        }
        return false
    }

    fun gte(other: Int): Boolean {
        return gte(NxVersion(other, 0, "$other.0.0", 0))
    }

    fun equals(other: NxVersion): Boolean {
        return this.major == other.major &&
            this.minor == other.minor &&
            this.patch == other.patch &&
            this.full == other.full
    }
}
