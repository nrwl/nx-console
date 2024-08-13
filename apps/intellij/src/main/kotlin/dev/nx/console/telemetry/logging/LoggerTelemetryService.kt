package dev.nx.console.telemetry.logging

import com.intellij.openapi.diagnostic.logger
import dev.nx.console.telemetry.Telemetry

class LoggerTelemetryService : Telemetry {
    val logger = logger<LoggerTelemetryService>()

    override suspend fun featureUsed(feature: String, data: Map<String, Any>?) {
        logger.info("[TELEMETRY] Feature used: $feature $data")
    }
}
