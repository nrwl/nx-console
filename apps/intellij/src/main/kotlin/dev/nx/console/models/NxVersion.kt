package dev.nx.console.models

import com.intellij.util.text.SemVer
import kotlinx.serialization.Serializable

@Serializable()
data class NxVersion(val minor: Int, val major: Int, val full: String) {
    public fun gte(other: NxVersion): Boolean {
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

    fun equals(other: NxVersion): Boolean {
        return this.major == other.major && this.minor == other.minor && this.full == other.full
    }
}
