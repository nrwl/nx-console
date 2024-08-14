package dev.nx.console.telemetry

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.util.application
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.logging.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

interface Telemetry {
    suspend fun featureUsed(feature: String, data: Map<String, Any>? = null)
}

@Service(Service.Level.PROJECT)
class TelemetryService(private val cs: CoroutineScope) {
    val logger = logger<TelemetryService>()

    companion object {
        fun getInstance(project: Project): TelemetryService =
            project.getService(TelemetryService::class.java)
    }

    private val service: Telemetry =
        if (application.isInternal) {
            LoggerTelemetryService()
        } else {
            MeasurementProtocolService(
                HttpClient(CIO) {
                    install(Logging) {
                        level = LogLevel.ALL
                        logger =
                            object : Logger {
                                override fun log(message: String) {
                                    this@TelemetryService.logger.info(message)
                                }
                            }
                    }
                }
            )
        }

    fun featureUsed(feature: TelemetryEvent, data: Map<String, Any>? = null) {
        val source = data?.get("source")
        if (
            source != null &&
                source is String &&
                TelemetryEventSource.isValidSource(source) &&
                application.isInternal
        ) {
            logger.error("source has to be of type TelemetryEventSource")
            return
        }
        cs.launch { service.featureUsed(feature.eventName, data) }
    }
}
