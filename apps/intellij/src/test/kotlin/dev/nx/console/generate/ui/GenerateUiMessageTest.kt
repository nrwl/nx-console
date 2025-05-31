package dev.nx.console.generate.ui

import dev.nx.console.models.*
import junit.framework.TestCase.*
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Test

class GenerateUiMessageTest {

    @Test
    fun `test generator schema message serialization`() {
        val options =
            listOf(
                NxOptionWithStringDefault(
                    default = "defaultValue",
                    name = "testOption",
                    isRequired = true,
                    deprecated = false,
                    description = "Test option",
                    type = "string",
                    enum = null,
                    items = null,
                    priority = null,
                    dropdown = null,
                    hint = null
                )
            )

        val generator =
            NxGenerator(
                name = "test-generator",
                schemaPath = "/path/to/schema",
                data =
                    NxGeneratorData(
                        collection = "@nx/test",
                        name = "test",
                        description = "Test generator",
                        type = "generator",
                        aliases = listOf("tst")
                    ),
                options = options,
                contextValues = null
            )

        val message =
            GenerateUiTestMessages.GeneratorSchema(generator = generator, errors = emptyList())

        val json = Json.encodeToString(message)
        val decoded = Json.decodeFromString<GenerateUiTestMessages.GeneratorSchema>(json)

        assertEquals(message.generator.name, decoded.generator.name)
        assertEquals(message.generator.options?.size, decoded.generator.options?.size)
    }

    @Test
    fun `test run generator message serialization`() {
        val message =
            GenerateUiTestMessages.RunGenerator(
                positional = "apps/myapp",
                flags = listOf("--style=css", "--routing=true"),
                generator = "@nx/react:app",
                dryRun = false,
                generatorPath = "/workspace"
            )

        val json = Json { encodeDefaults = true }.encodeToString(message)
        assertTrue(json.contains("positional"))
        assertTrue(json.contains("dryRun"))
    }

    @Test
    fun `test configuration message`() {
        val message = GenerateUiTestMessages.Configuration(enableTaskExecutionDryRunOnChange = true)
        val json = Json.encodeToString(message)
        assertTrue(json.contains("enableTaskExecutionDryRunOnChange"))
    }

    @Test
    fun `test styles message`() {
        val message = GenerateUiTestMessages.Styles(stylesheet = ".custom { color: red; }")
        val json = Json.encodeToString(message)
        assertTrue(json.contains("stylesheet"))
    }

    @Test
    fun `test schema request message`() {
        val message =
            GenerateUiTestMessages.SchemaRequest(
                generatorPath = "/workspace",
                generator = "@nx/react:app"
            )
        val json = Json.encodeToString(message)
        assertTrue(json.contains("generatorPath"))
        assertTrue(json.contains("generator"))
    }

    @Test
    fun `test validation results message`() {
        val results =
            mapOf(
                "field1" to GenerateUiTestMessages.ValidationResult(isValid = true, error = null),
                "field2" to
                    GenerateUiTestMessages.ValidationResult(
                        isValid = false,
                        error = "Field is required"
                    )
            )

        val message = GenerateUiTestMessages.ValidationResults(results = results)
        val json = Json.encodeToString(message)
        assertTrue(json.contains("field1"))
        assertTrue(json.contains("field2"))
        assertTrue(json.contains("Field is required"))
    }
}
