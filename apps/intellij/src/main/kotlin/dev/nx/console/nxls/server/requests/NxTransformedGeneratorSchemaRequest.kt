package dev.nx.console.nxls.server.requests

import dev.nx.console.generate.ui.GeneratorSchema
import kotlinx.serialization.Serializable

@Serializable data class NxTransformedGeneratorSchemaRequest(val options: GeneratorSchema)
