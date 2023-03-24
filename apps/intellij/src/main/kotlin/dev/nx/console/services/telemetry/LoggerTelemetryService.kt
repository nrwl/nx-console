package dev.nx.console.services.telemetry

import com.intellij.openapi.diagnostic.logger

class LoggerTelemetryService : Telemetry {
    val logger = logger<LoggerTelemetryService>()
    override fun featureUsed(feature: String) {
        logger.info("[TELEMETRY] Feature used: $feature")
    }

    override fun extensionActivated(time: Int) {
        logger.info("[TELEMETRY] Extension activated: $time")
    }

    override fun extensionDeactivated(time: Int) {
        logger.info("[TELEMETRY] Extension deactivated: $time")
    }

}