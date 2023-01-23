package dev.nx.console.generate_ui.editor

import dev.nx.console.nxls.server.NxGeneratorOption
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
    val description: String,
    val options: List<NxGeneratorOption>
) {
    @EncodeDefault() val command: String = "generate"

    @EncodeDefault() val cliName: String = "nx"

    @EncodeDefault() val positional = this.name
}

@Serializable
@SerialName("generator")
data class GeneratorSchemaMessage(override val payload: GeneratorSchemaPayload) :
    TaskExecutionInputMessage {}

@Serializable
data class StylePayload(
    val backgroundColor: String,
    val primaryTextColor: String,
    val secondaryTextColor: String,
    val fieldBackground: String
)

@Serializable
@SerialName("style")
data class StyleMessage(override val payload: StylePayload) : TaskExecutionInputMessage {}

@Serializable
sealed interface TaskExecutionOutputMessage {
    val type: String
}

@Serializable
@SerialName("output-init")
data class TaskExecutionFormInitOutputMessage(override val type: String) :
    TaskExecutionOutputMessage {}

@Serializable()
data class TaskExecutionRunCommandPayload(val positional: String, val flags: List<String>) {}

@Serializable()
@SerialName("run-command")
data class TaskExecutionRunCommandOutputMessage(
    override val type: String,
    val payload: TaskExecutionRunCommandPayload
) : TaskExecutionOutputMessage {}
