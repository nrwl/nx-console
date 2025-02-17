package dev.nx.console.models

import kotlinx.serialization.Serializable

@Serializable
data class GeneratorSchema(
    val collectionName: String,
    val generatorName: String,
    val description: String,
    val options: List<NxGeneratorOption>,
    val context: NxGeneratorContext?
) {}
