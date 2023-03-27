package dev.nx.console.services.telemetry.measurementProtocol.payload

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MeasurementProtocolFeatureUsedParams(val action_type: String) :
    MeasurementProtocolBaseParams()

@Serializable
@SerialName("action_triggered")
class MeasurementProtocolFeatureUsedEvent
private constructor(override val params: MeasurementProtocolFeatureUsedParams) :
    MeasurementProtocolEvent() {
    constructor(feature: String) : this(MeasurementProtocolFeatureUsedParams(feature))
}
