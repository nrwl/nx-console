package dev.nx.console.telemetry.measurementProtocol

import com.intellij.ide.plugins.PluginManager
import com.intellij.openapi.application.ApplicationInfo
import com.intellij.openapi.application.PermanentInstallationID
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.util.SystemInfo
import com.intellij.util.application
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.telemetry.Telemetry
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.telemetry.TelemetryValues
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import java.util.*
import kotlinx.serialization.json.*

val SESSION_ID = UUID.randomUUID().toString()

private val logger = logger<MeasurementProtocolService>()

class MeasurementProtocolService(private val client: HttpClient) : Telemetry {

    override suspend fun featureUsed(feature: String, data: Map<String, Any>?) {
        val payload = this.buildPayload(feature, data)

        try {
            post(payload)
        } catch (e: Exception) {
            logger.warn(e.toString())
        } catch (e: Throwable) {
            logger.warn(e.toString())
        }
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
            logger.warn(e.toString())
        } catch (e: Throwable) {
            logger.warn(e.toString())
        }
    }

    private fun buildPayload(eventName: String, data: Map<String, Any>?): String {
        val payload = buildJsonObject {
            put("client_id", PermanentInstallationID.get())
            put("user_id", PermanentInstallationID.get())
            put("timestamp_micros", System.currentTimeMillis() * 1000)
            put("non_personalized_ads", true)
            putJsonObject("user_properties") {
                putJsonObject("editor") {
                    put("value", ApplicationInfo.getInstance().fullApplicationName)
                }
                putJsonObject("os") { put("value", SystemInfo.OS_NAME) }
                putJsonObject("appversion") {
                    put(
                        "value",
                        PluginManager.getPluginByClass(TelemetryService::class.java)?.version
                            ?: "0.0.0")
                }
            }
            putJsonArray("events") {
                addJsonObject {
                    put("name", "actionTriggered")
                    putJsonObject("params") {
                        put("engagement_time_msec", "1")
                        put("session_id", SESSION_ID)
                        put("debug_mode", if (application.isInternal) 1 else null)

                        put("action_type", eventName)

                        data?.forEach { put(it.key, it.value.toString()) }
                    }
                }
            }
        }

        return payload.toString()
    }
}
