package dev.nx.console.telemetry

import com.intellij.ide.plugins.PluginManager
import com.intellij.openapi.application.ApplicationInfo
import com.intellij.openapi.application.PermanentInstallationID
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.util.SystemInfo
import com.intellij.util.io.HttpRequests
import dev.nx.console.settings.NxConsoleSettingsProvider
import java.util.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

val SESSION_ID = UUID.randomUUID().toString()

private val logger = logger<MeasurementProtocolService>()

class MeasurementProtocolService : Telemetry {

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

    private suspend fun post(payload: String) =
        withContext(Dispatchers.IO) {
            if (!NxConsoleSettingsProvider.getInstance().enableTelemetry) return@withContext

            try {
                val response =
                    HttpRequests.post(TelemetryValues.URL, "application/json").connect { request ->
                        request.write(payload)
                        request.readString()
                    }

                if (response.isNotEmpty()) {
                    logger.info(response)
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
                            ?: "0.0.0",
                    )
                }
            }
            putJsonArray("events") {
                addJsonObject {
                    put("name", "actionTriggered")
                    putJsonObject("params") {
                        put("engagement_time_msec", "1")
                        put("session_id", SESSION_ID)
                        put("action_type", eventName)

                        // only here to facilitate easy debugging, if you want to track events in
                        // the GA DebugView set this to true
                        if (false) {
                            put("debug_mode", 1)
                        }

                        data?.forEach { put(it.key, it.value.toString()) }
                    }
                }
            }
        }

        return payload.toString()
    }
}
