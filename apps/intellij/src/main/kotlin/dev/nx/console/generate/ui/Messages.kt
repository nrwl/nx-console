package dev.nx.console.generate.ui

import dev.nx.console.models.NxGeneratorContext
import dev.nx.console.models.NxGeneratorOption
import kotlinx.serialization.EncodeDefault
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
sealed interface TaskExecutionInputMessage {
    // the 'type' property will be included in the stringified JSON via the SerialName decorator
    val payload: Any?
}

@Serializable
data class GlobalConfigurationPayload(val enableTaskExecutionDryRunOnChange: Boolean) {}

@Serializable
@SerialName("config")
data class GlobalConfigurationMessage(override val payload: GlobalConfigurationPayload) :
    TaskExecutionInputMessage {}

@Serializable
data class GeneratorSchemaPayload(
    val name: String,
    val collection: String,
    val description: String,
    val options: List<NxGeneratorOption>,
    val contextValues: NxGeneratorContext?
) {
    @EncodeDefault() val command: String = "generate"

    @EncodeDefault() val positional = "${this.collection}:${this.name}"
}

@Serializable
@SerialName("generator")
data class GeneratorSchemaMessage(override val payload: GeneratorSchemaPayload) :
    TaskExecutionInputMessage {}

@Serializable
data class StylePayload(
    val backgroundColor: String,
    val highlightTextColor: String,
    val secondaryTextColor: String,
    val fieldBackground: String,
    val fontFamily: String,
    val fontSize: String,
)

@Serializable
@SerialName("style")
data class StyleMessage(override val payload: StylePayload) : TaskExecutionInputMessage {}

@Serializable
sealed interface TaskExecutionOutputMessage {
    val payloadType: String
}

@Serializable()
@SerialName("output-init")
data class TaskExecutionFormInitOutputMessage(override val payloadType: String) :
    TaskExecutionOutputMessage {}

@Serializable()
data class TaskExecutionRunCommandPayload(val positional: String, val flags: List<String>) {}

@Serializable()
@SerialName("run-command")
data class TaskExecutionRunCommandOutputMessage(
    override val payloadType: String,
    val payload: TaskExecutionRunCommandPayload
) : TaskExecutionOutputMessage {}
