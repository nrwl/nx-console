package dev.nx.console.telemetry

interface Telemetry {
    suspend fun featureUsed(feature: String)
    suspend fun extensionActivated(time: Int)
    suspend fun extensionDeactivated(time: Int)
}
