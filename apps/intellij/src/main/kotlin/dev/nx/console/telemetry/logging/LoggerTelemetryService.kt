package dev.nx.console.telemetry.logging

import com.intellij.openapi.diagnostic.logger
import dev.nx.console.telemetry.Telemetry

class LoggerTelemetryService : Telemetry {
    val logger = logger<LoggerTelemetryService>()
    override suspend fun featureUsed(feature: String) {
        logger.info("[TELEMETRY] Feature used: $feature")
    }

    override suspend fun extensionActivated(time: Int) {
        logger.info("[TELEMETRY] Extension activated: $time")
    }

    override suspend fun extensionDeactivated(time: Int) {
        logger.info("[TELEMETRY] Extension deactivated: $time")
    }
}
