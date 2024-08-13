package dev.nx.console.telemetry

interface Telemetry {
    suspend fun featureUsed(feature: String, data: Map<String, Any>? = null)
}
