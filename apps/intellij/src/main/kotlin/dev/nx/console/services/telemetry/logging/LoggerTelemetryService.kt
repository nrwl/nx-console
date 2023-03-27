package dev.nx.console.services.telemetry.logging

import com.intellij.openapi.diagnostic.logger
import dev.nx.console.services.telemetry.Telemetry

val logger = logger<LoggerTelemetryService>()

class LoggerTelemetryService : Telemetry {
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
