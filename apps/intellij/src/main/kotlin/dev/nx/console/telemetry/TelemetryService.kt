package dev.nx.console.telemetry

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.util.application
import dev.nx.console.telemetry.logging.LoggerTelemetryService
import dev.nx.console.telemetry.measurementProtocol.MeasurementProtocolService
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.logging.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class TelemetryService {
    val logger = logger<TelemetryService>()

    companion object {
        fun getInstance(project: Project): TelemetryService =
            project.getService(TelemetryService::class.java)
    }

    val scope = CoroutineScope(Dispatchers.Default)

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

    fun featureUsed(feature: String) {
        scope.launch { service.featureUsed(feature) }
    }

    fun extensionActivated(time: Int) {
        scope.launch { service.extensionActivated(time) }
    }

    fun extensionDeactivated(time: Int) {
        scope.launch { service.extensionDeactivated(time) }
    }
}
