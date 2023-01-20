package dev.nx.console.generate_ui.editor

import dev.nx.console.nxls.server.NxGenerator
import dev.nx.console.nxls.server.NxGeneratorOption
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
sealed interface Message {
  val payload: Any;
}

@Serializable
data class GeneratorPayload(val generator: NxGenerator, val options: List<NxGeneratorOption>)

@Serializable
@SerialName("generator")
data class GeneratorMessage(override val payload: GeneratorPayload): Message {
}

@Serializable
data class StylePayload(val backgroundColor: String)

@Serializable
@SerialName("style")
data class StyleMessage(override val payload: StylePayload): Message {
}
