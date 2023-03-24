package dev.nx.console.services.telemetry

import com.intellij.openapi.project.Project
import com.intellij.util.application
import io.ktor.client.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*


class TelemetryService : Telemetry {

    companion object {
        fun getInstance(project: Project): TelemetryService = project.getService(TelemetryService::class.java)
    }

    // TODO: revert this logic 
    private val service: Telemetry = if (!application.isInternal) {
        LoggerTelemetryService()
    } else {
        MeasurementProtocolTelemetryService(HttpClient() {
            install(ContentNegotiation) {
                json()
            }
        })
    }

    override fun featureUsed(feature: String) {
        service.featureUsed(feature)
    }

    override fun extensionActivated(time: Int) {
        service.extensionActivated(time)
    }

    override fun extensionDeactivated(time: Int) {
        service.extensionDeactivated(time)
    }
}

