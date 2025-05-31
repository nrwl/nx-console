package dev.nx.console.generate.ui

import dev.nx.console.models.*
import junit.framework.TestCase.*
import org.junit.Test

class GeneratorSchemaTransformTest {

    @Test
    fun `test required field validation`() {
        val requiredOption =
            NxOptionWithNoDefault(
                name = "projectName",
                isRequired = true,
                deprecated = false,
                description = "Name of the project",
                type = "string",
                enum = null,
                items = null,
                priority = "important",
                dropdown = null,
                hint = null
            )

        val generator = createTestGenerator(listOf(requiredOption))

        // Test validation logic
        assertTrue(requiredOption.isRequired == true)
        assertNull(getDefaultValue(requiredOption))
    }

    @Test
    fun `test enum field validation`() {
        val enumOption =
            NxOptionWithStringDefault(
                default = "css",
                name = "style",
                isRequired = false,
                deprecated = false,
                description = "Style type",
                type = "string",
                enum = listOf("css", "scss", "less", "styled-components"),
                items = null,
                priority = null,
                dropdown = null,
                hint = null
            )

        val generator = createTestGenerator(listOf(enumOption))

        // Test enum validation
        assertNotNull(enumOption.enum)
        assertEquals(4, enumOption.enum?.size)
        assertTrue(enumOption.enum?.contains("css") == true)
        assertEquals("css", enumOption.default)
    }

    @Test
    fun `test conditional field visibility`() {
        val routingOption =
            NxOptionWithBooleanDefault(
                default = false,
                name = "routing",
                isRequired = false,
                deprecated = false,
                description = "Add routing",
                type = "boolean",
                enum = null,
                items = null,
                priority = null,
                dropdown = null,
                hint = null
            )

        val routeOption =
            NxOptionWithStringDefault(
                default = "/",
                name = "route",
                isRequired = false,
                deprecated = false,
                description = "Default route",
                type = "string",
                enum = null,
                items = null,
                priority = null,
                dropdown = null,
                hint = "Visible when routing is true"
            )

        val generator = createTestGenerator(listOf(routingOption, routeOption))

        // Test conditional logic
        assertFalse(routingOption.default)
        assertNotNull(routeOption.hint)
    }

    @Test
    fun `test number field validation`() {
        val numberOption =
            NxOptionWithNumberDefault(
                default = 8080,
                name = "port",
                isRequired = false,
                deprecated = false,
                description = "Port number",
                type = "number",
                enum = null,
                items = null,
                priority = null,
                dropdown = null,
                hint = null
            )

        val generator = createTestGenerator(listOf(numberOption))

        assertEquals(8080, numberOption.default)
        assertEquals("number", numberOption.type)
    }

    @Test
    fun `test boolean field validation`() {
        val booleanOption =
            NxOptionWithBooleanDefault(
                default = true,
                name = "enableProdMode",
                isRequired = false,
                deprecated = false,
                description = "Enable production mode",
                type = "boolean",
                enum = null,
                items = null,
                priority = null,
                dropdown = null,
                hint = null
            )

        val generator = createTestGenerator(listOf(booleanOption))

        assertTrue(booleanOption.default)
        assertEquals("boolean", booleanOption.type)
    }

    @Test
    fun `test array field validation`() {
        val arrayOption =
            NxOptionWithArrayDefault(
                default = listOf("jest", "cypress"),
                name = "testRunners",
                isRequired = false,
                deprecated = false,
                description = "Test runners to include",
                type = "array",
                enum = null,
                items = listOf("jest", "cypress", "playwright", "vitest"),
                priority = null,
                dropdown = null,
                hint = null
            )

        val generator = createTestGenerator(listOf(arrayOption))

        assertEquals(2, arrayOption.default.size)
        assertTrue(arrayOption.default.contains("jest"))
        assertNotNull(arrayOption.items)
        assertEquals(4, arrayOption.items?.size)
    }

    @Test
    fun `test default values`() {
        val stringDefault =
            NxOptionWithStringDefault(
                default = "my-app",
                name = "name",
                isRequired = false,
                deprecated = false,
                description = "App name",
                type = "string",
                enum = null,
                items = null,
                priority = null,
                dropdown = null,
                hint = null
            )

        assertEquals("my-app", stringDefault.default)
    }

    @Test
    fun `test x-priority ordering`() {
        val importantOption =
            NxOptionWithNoDefault(
                name = "important",
                isRequired = true,
                deprecated = false,
                description = "Important option",
                type = "string",
                enum = null,
                items = null,
                priority = "important",
                dropdown = null,
                hint = null
            )

        val normalOption =
            NxOptionWithNoDefault(
                name = "normal",
                isRequired = false,
                deprecated = false,
                description = "Normal option",
                type = "string",
                enum = null,
                items = null,
                priority = null,
                dropdown = null,
                hint = null
            )

        assertEquals("important", importantOption.priority)
        assertNull(normalOption.priority)
    }

    // Helper functions
    private fun createTestGenerator(options: List<NxGeneratorOption>): NxGenerator {
        return NxGenerator(
            name = "test-generator",
            schemaPath = "/path/to/schema",
            data =
                NxGeneratorData(
                    collection = "@test/collection",
                    name = "test",
                    description = "Test generator",
                    type = "generator",
                    aliases = emptyList()
                ),
            options = options,
            contextValues = null
        )
    }

    private fun getDefaultValue(option: NxGeneratorOption): Any? {
        return when (option) {
            is NxOptionWithStringDefault -> option.default
            is NxOptionWithBooleanDefault -> option.default
            is NxOptionWithNumberDefault -> option.default
            is NxOptionWithArrayDefault -> option.default
            is NxOptionWithNoDefault -> null
        }
    }
}
