package dev.nx.console.telemetry

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import dev.nx.console.utils.isDevelopmentInstance
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

interface Telemetry {
    suspend fun featureUsed(feature: String, data: Map<String, Any>? = null)
}

@Service(Service.Level.PROJECT)
class TelemetryService(private val cs: CoroutineScope) {
    private val isDevelopmentInstance = isDevelopmentInstance()
    val logger = logger<TelemetryService>()

    companion object {
        fun getInstance(project: Project): TelemetryService =
            project.getService(TelemetryService::class.java)
    }

    private val service: Telemetry =
        if (isDevelopmentInstance) {
            LoggerTelemetryService()
        } else {
            MeasurementProtocolService()
        }

    fun featureUsed(feature: TelemetryEvent, data: Map<String, Any>? = null) {
        val source = data?.get("source")
        if (
            source != null &&
                source is String &&
                TelemetryEventSource.isValidSource(source) &&
                isDevelopmentInstance
        ) {
            logger.error("source has to be of type TelemetryEventSource")
            return
        }
        cs.launch { service.featureUsed(feature.eventName, data) }
    }

    // String-based method for compatibility with VSCode telemetry patterns
    fun featureUsed(feature: String, data: Map<String, Any>? = null) {
        val source = data?.get("source")
        if (
            source != null &&
                source is String &&
                !TelemetryEventSource.isValidSource(source) &&
                isDevelopmentInstance
        ) {
            logger.error("Invalid telemetry source: $source")
            return
        }
        cs.launch { service.featureUsed(feature, data) }
    }
}
