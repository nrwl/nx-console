package dev.nx.console.models

import com.intellij.util.text.SemVer
import kotlinx.serialization.Serializable

@Serializable()
data class NxVersion(val minor: Int, val major: Int, val full: String) {
    fun gte(other: NxVersion): Boolean {
        if (this.full.startsWith("0.0.0-pr-")) {
            return true
        }
        if (other.full.startsWith("0.0.0-pr-")) {
            return false
        }
        val semVerThis = SemVer.parseFromText(this.full)
        val semVerOther = SemVer.parseFromText(other.full)
        if (semVerThis != null && semVerOther != null) {
            return semVerThis >= semVerOther
        }
        if (this.major > other.major) {
            return true
        } else if (this.major == other.major) {
            return this.minor >= other.minor
        }
        return false
    }

    fun gte(other: Int): Boolean {
        return gte(NxVersion(other, 0, "$other.0.0"))
    }

    fun equals(other: NxVersion): Boolean {
        return this.major == other.major && this.minor == other.minor && this.full == other.full
    }
}
