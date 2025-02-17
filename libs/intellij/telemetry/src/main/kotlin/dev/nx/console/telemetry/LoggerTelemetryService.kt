package dev.nx.console.telemetry

import com.intellij.openapi.diagnostic.logger

class LoggerTelemetryService : Telemetry {
    val logger = logger<LoggerTelemetryService>()

    override suspend fun featureUsed(feature: String, data: Map<String, Any>?) {
        logger.info("[TELEMETRY] Feature used: $feature $data")
    }
}
