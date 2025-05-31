package dev.nx.console.generate.ui

import dev.nx.console.models.NxGenerator
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

// Test message types that extend the actual messages but are easier to work with in tests
object GenerateUiTestMessages {

    @Serializable
    data class GeneratorSchema(val generator: NxGenerator, val errors: List<String> = emptyList())

    @Serializable
    data class RunGenerator(
        val positional: String,
        val flags: List<String>,
        val generator: String,
        val dryRun: Boolean,
        val generatorPath: String
    )

    @Serializable data class Configuration(val enableTaskExecutionDryRunOnChange: Boolean)

    @Serializable data class Styles(val stylesheet: String)

    @Serializable data class SchemaRequest(val generatorPath: String, val generator: String)

    @Serializable data class ValidationRequest(val values: Map<String, JsonElement>)

    @Serializable data class ValidationResult(val isValid: Boolean, val error: String? = null)

    @Serializable data class ValidationResults(val results: Map<String, ValidationResult>)

    @Serializable data class CopyToClipboard(val text: String)

    @Serializable data class StartupMessage(val message: String, val severity: String)
}
