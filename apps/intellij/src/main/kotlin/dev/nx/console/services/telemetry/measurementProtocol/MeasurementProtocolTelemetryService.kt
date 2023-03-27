package dev.nx.console.services.telemetry.measurementProtocol

import dev.nx.console.services.telemetry.Telemetry
import dev.nx.console.services.telemetry.TelemetryValues
import dev.nx.console.services.telemetry.logging
import dev.nx.console.services.telemetry.measurementProtocol.payload.MeasurementProtocolExtensionActivatedEvent
import dev.nx.console.services.telemetry.measurementProtocol.payload.MeasurementProtocolFeatureUsedEvent
import dev.nx.console.services.telemetry.measurementProtocol.payload.MeasurementProtocolPayload
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

val json = Json {
    encodeDefaults = true
    classDiscriminator = "name"
}

class MeasurementProtocolService(private val client: HttpClient) : Telemetry {

    override suspend fun featureUsed(feature: String) {
        val featureUsed = MeasurementProtocolPayload(MeasurementProtocolFeatureUsedEvent(feature))

        try {
            post(json.encodeToString(featureUsed))
        } catch (e: Exception) {
            logging.error(e.printStackTrace())
        }
    }

    override suspend fun extensionActivated(time: Int) {
        val extensionActivated =
            MeasurementProtocolPayload(MeasurementProtocolExtensionActivatedEvent(0))
        try {
            post(json.encodeToString(extensionActivated))
        } catch (e: Exception) {
            logging.error(e.printStackTrace())
        }
    }

    override suspend fun extensionDeactivated(time: Int) {
        TODO("Not yet implemented")
    }

    private suspend fun post(payload: String) {
        try {
            client
                .post {
                    url(TelemetryValues.URL)
                    setBody(payload)
                }
                .body<String>()
                .run {
                    if (isNotEmpty()) {
                        logging.info(this)
                    }
                }
        } catch (e: Exception) {
            logging.error(e.printStackTrace())
        }
    }
}
