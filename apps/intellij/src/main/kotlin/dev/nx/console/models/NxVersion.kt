package dev.nx.console.models

import kotlinx.serialization.Serializable

@Serializable() data class NxVersion(val minor: Int, val major: Int, val full: String) {}
