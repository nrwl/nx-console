package dev.nx.console.services.telemetry.measurementProtocol.payload

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MeasurementProtocolExtensionParams(val timing: Int) : MeasurementProtocolBaseParams()

@Serializable
@SerialName("activated")
class MeasurementProtocolExtensionActivatedEvent
private constructor(override val params: MeasurementProtocolExtensionParams) :
    MeasurementProtocolEvent() {
    constructor(time: Int) : this(MeasurementProtocolExtensionParams(time))
}
