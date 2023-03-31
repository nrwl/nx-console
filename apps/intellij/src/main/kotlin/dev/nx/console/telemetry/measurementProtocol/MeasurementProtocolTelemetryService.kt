package dev.nx.console.telemetry.measurementProtocol

import com.intellij.openapi.diagnostic.logger
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.telemetry.Telemetry
import dev.nx.console.telemetry.TelemetryValues
import dev.nx.console.telemetry.measurementProtocol.payload.MeasurementProtocolExtensionActivatedEvent
import dev.nx.console.telemetry.measurementProtocol.payload.MeasurementProtocolFeatureUsedEvent
import dev.nx.console.telemetry.measurementProtocol.payload.MeasurementProtocolPayload
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

val json = Json {
    encodeDefaults = true
    classDiscriminator = "name"
}

private val logger = logger<MeasurementProtocolService>()

class MeasurementProtocolService(private val client: HttpClient) : Telemetry {

    override suspend fun featureUsed(feature: String) {
        val featureUsed = MeasurementProtocolPayload(MeasurementProtocolFeatureUsedEvent(feature))

        try {
            post(json.encodeToString(featureUsed))
        } catch (e: Exception) {
            logger.error(e.printStackTrace())
        }
    }

    override suspend fun extensionActivated(time: Int) {
        val extensionActivated =
            MeasurementProtocolPayload(MeasurementProtocolExtensionActivatedEvent(0))
        try {
            post(json.encodeToString(extensionActivated))
        } catch (e: Exception) {
            logger.error(e.printStackTrace())
        }
    }

    override suspend fun extensionDeactivated(time: Int) {
        TODO("Not yet implemented")
    }

    private suspend fun post(payload: String) {
        if (!NxConsoleSettingsProvider.getInstance().enableTelemetry) return

        try {
            client
                .post {
                    url(TelemetryValues.URL)
                    setBody(payload)
                }
                .body<String>()
                .run {
                    if (isNotEmpty()) {
                        logger.info(this)
                    }
                }
        } catch (e: Exception) {
            logger.error(e.printStackTrace())
        }
    }
}
