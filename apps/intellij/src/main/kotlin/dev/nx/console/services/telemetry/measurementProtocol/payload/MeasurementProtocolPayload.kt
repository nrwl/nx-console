package dev.nx.console.services.telemetry.measurementProtocol.payload

import com.intellij.ide.plugins.PluginManager
import com.intellij.openapi.application.ApplicationInfo
import com.intellij.openapi.application.PermanentInstallationID
import com.intellij.openapi.util.SystemInfo
import com.intellij.util.application
import dev.nx.console.services.telemetry.TelemetryService
import java.util.*
import kotlinx.serialization.Serializable

@Serializable
class MeasurementProtocolPayload private constructor(val events: List<MeasurementProtocolEvent>) {
    constructor(payload: MeasurementProtocolEvent) : this(listOf(payload))

    var client_id = PermanentInstallationID.get()
    var user_id = PermanentInstallationID.get()
    var timestamp_micros = System.currentTimeMillis() * 1000
    var non_personalized_ads = true
    var user_properties = MeasurementProtocolUserProperties()
}

@Serializable
class MeasurementProtocolUserProperties {
    val editor = MeasurementProtocolValue(ApplicationInfo.getInstance().fullApplicationName)
    val os = MeasurementProtocolValue(SystemInfo.OS_NAME)
    val appversion =
        MeasurementProtocolValue(
            PluginManager.getPluginByClass(TelemetryService::class.java)?.version ?: "0.0.0"
        )
}

@Serializable
data class MeasurementProtocolValue(val value: String)

@Serializable
open class MeasurementProtocolBaseParams() {
    val engagement_time_msec = "1"
    val session_id = UUID.randomUUID().toString()
    val debug_mode = application.isInternal
}

@Serializable
sealed class MeasurementProtocolEvent {
    abstract val params: MeasurementProtocolBaseParams
}
