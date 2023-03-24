package dev.nx.console.services.telemetry

import com.intellij.util.application
import io.ktor.client.*
import io.ktor.client.request.*
import kotlinx.coroutines.runBlocking
import kotlinx.datetime.DateTimePeriod
import kotlinx.serialization.Serializable


class MeasurementProtocolTelemetryService(val client: HttpClient) : Telemetry {
    override fun featureUsed(feature: String) {
        val event = TelemetryFeatureEvent(feature)
    }

    override fun extensionActivated(time: Int) {
        runBlocking { client.post { url(TelemetryValues.URL) } }
    }

    override fun extensionDeactivated(time: Int) {
        TODO("Not yet implemented")
    }

    fun post() {
        runBlocking { client.post { url(TelemetryValues.URL) } }
    }
}


@Serializable
private class TelemetryPayload<T : TelemetryBaseEvent>(val name: String, val params: T) {
    val client_id = "1234";
    val user_id = "1234";
    val timestamp_micros = 1123
}

@Serializable
private open class TelemetryBaseEvent() {
    val engagement_time_msec = "1";
    val session_id = "1";
    val debug_mode = application.isInternal
}

@Serializable
private data class TelemetryFeatureEvent(val action_type: String) : TelemetryBaseEvent()
