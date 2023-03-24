package dev.nx.console.services.telemetry

interface Telemetry {
    fun featureUsed(feature: String)
    fun extensionActivated(time: Int)
    fun extensionDeactivated(time: Int)
}