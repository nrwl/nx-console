package dev.nx.console.generate.ui

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.generate.ui.mocks.MockNxlsService
import dev.nx.console.generate.ui.mocks.MockRunGeneratorManager
import dev.nx.console.generate.ui.mocks.TestGenerateUiBrowser
import dev.nx.console.models.*
import junit.framework.TestCase.*
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import org.junit.Test

class GenerateUiIntegrationTest : BasePlatformTestCase() {

    private lateinit var browser: TestGenerateUiBrowser
    private lateinit var runGeneratorManager: MockRunGeneratorManager
    private lateinit var nxlsService: MockNxlsService
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    override fun setUp() {
        super.setUp()
        browser = TestGenerateUiBrowser()
        runGeneratorManager = MockRunGeneratorManager()
        nxlsService = MockNxlsService(project)
    }

    @Test
    fun `test full generator flow`() {
        // Setup generator
        val generator = createReactAppGenerator()

        // Initialize UI
        browser.sendMessage(
            "generatorSchema",
            json.encodeToString(
                GenerateUiTestMessages.GeneratorSchema(generator = generator, errors = emptyList())
            )
        )

        // User fills form and submits
        val formValues =
            mapOf(
                "name" to JsonPrimitive("myapp"),
                "style" to JsonPrimitive("scss"),
                "routing" to JsonPrimitive(true)
            )

        // Validate form
        browser.simulateMessage(
            "validationRequest",
            json.encodeToString(GenerateUiTestMessages.ValidationRequest(values = formValues))
        )

        // Submit generator
        browser.simulateRunGenerator(
            positional = "apps/myapp",
            flags = listOf("--name=myapp", "--style=scss", "--routing"),
            dryRun = false
        )

        // Verify generator was queued
        val queued = runGeneratorManager.getQueuedGenerators()
        assertEquals(1, queued.size)
        assertEquals("@nx/react:app", queued.first().generatorString)
    }

    @Test
    fun `test validation with errors`() {
        val generator = createReactAppGenerator()

        browser.sendMessage(
            "generatorSchema",
            json.encodeToString(
                GenerateUiTestMessages.GeneratorSchema(generator = generator, errors = emptyList())
            )
        )

        // Submit with missing required field
        val incompleteValues = mapOf("style" to JsonPrimitive("css")) // Missing required "name"

        browser.simulateMessage(
            "validationRequest",
            json.encodeToString(GenerateUiTestMessages.ValidationRequest(values = incompleteValues))
        )

        // Check validation response
        val messages = browser.getAllMessages()
        val validationResponse = messages.findLast { it.first == "validationResults" }
        assertNotNull(validationResponse)

        val results =
            json.decodeFromString<GenerateUiTestMessages.ValidationResults>(
                validationResponse!!.second
            )
        assertFalse(results.results["name"]?.isValid ?: true)
    }

    @Test
    fun `test dry run mode`() {
        val generator = createReactAppGenerator()

        browser.sendMessage(
            "generatorSchema",
            json.encodeToString(
                GenerateUiTestMessages.GeneratorSchema(generator = generator, errors = emptyList())
            )
        )

        // Enable dry run and submit
        browser.simulateRunGenerator(
            positional = "apps/dryapp",
            flags = listOf("--name=dryapp", "--style=css"),
            dryRun = true
        )

        val queued = runGeneratorManager.getQueuedGenerators()
        assertEquals(1, queued.size)
        assertTrue(queued.first().dryRun)
    }

    @Test
    fun `test conditional field handling`() {
        val generator = createGeneratorWithConditionalFields()

        browser.sendMessage(
            "generatorSchema",
            json.encodeToString(
                GenerateUiTestMessages.GeneratorSchema(generator = generator, errors = emptyList())
            )
        )

        // Test with routing disabled - route field should not be included
        browser.simulateRunGenerator(
            positional = "apps/noroute",
            flags = listOf("--name=noroute", "--routing=false"),
            dryRun = false
        )

        val queuedNoRoute = runGeneratorManager.getQueuedGenerators().last()
        assertFalse(queuedNoRoute.flags.containsKey("route"))

        // Test with routing enabled - route field should be included
        browser.simulateRunGenerator(
            positional = "apps/withroute",
            flags = listOf("--name=withroute", "--routing=true", "--route=/app"),
            dryRun = false
        )

        val queuedWithRoute = runGeneratorManager.getQueuedGenerators().last()
        assertEquals("/app", queuedWithRoute.flags["route"])
    }

    @Test
    fun `test multiple generators`() {
        // Run first generator
        browser.simulateRunGenerator(
            positional = "apps/app1",
            flags = listOf("--name=app1"),
            dryRun = false
        )

        // Run second generator
        browser.simulateRunGenerator(
            positional = "libs/lib1",
            flags = listOf("--name=lib1"),
            dryRun = false
        )

        val queued = runGeneratorManager.getQueuedGenerators()
        assertEquals(2, queued.size)
        assertEquals("apps/app1", queued[0].cwd)
        assertEquals("libs/lib1", queued[1].cwd)
    }

    @Test
    fun `test clipboard copy`() {
        val command = "nx g @nx/react:app myapp --style=scss --routing"

        browser.simulateMessage(
            "copyToClipboard",
            json.encodeToString(GenerateUiTestMessages.CopyToClipboard(text = command))
        )

        // In real implementation, this would copy to system clipboard
        // Here we just verify the message was handled without errors
    }

    @Test
    fun `test startup message display`() {
        val generator = createReactAppGenerator()
        val startupMessage =
            GenerateUiTestMessages.StartupMessage(
                message = "This generator requires Node.js 18 or higher",
                severity = "warning"
            )

        browser.sendMessage(
            "generatorSchema",
            json.encodeToString(
                GenerateUiTestMessages.GeneratorSchema(generator = generator, errors = emptyList())
            )
        )

        browser.sendMessage("startupMessage", json.encodeToString(startupMessage))

        val messages = browser.getAllMessages()
        assertTrue(messages.any { it.first == "startupMessage" })
    }

    @Test
    fun `test error recovery`() {
        // Send malformed message
        try {
            browser.simulateMessage("invalidType", "{invalid json}")
        } catch (e: Exception) {
            // Expected - should handle gracefully
        }

        // System should still be functional
        browser.simulateRunGenerator(
            positional = "apps/recovery",
            flags = listOf("--name=recovery"),
            dryRun = false
        )

        assertEquals(1, runGeneratorManager.getQueuedGenerators().size)
    }

    // Helper functions
    private fun createReactAppGenerator(): NxGenerator {
        return NxGenerator(
            name = "@nx/react:app",
            schemaPath = "/schemas/app.json",
            data =
                NxGeneratorData(
                    collection = "@nx/react",
                    name = "app",
                    description = "Create a React application",
                    type = "generator",
                    aliases = listOf("application")
                ),
            options =
                listOf(
                    NxOptionWithNoDefault(
                        name = "name",
                        isRequired = true,
                        deprecated = false,
                        description = "Application name",
                        type = "string",
                        enum = null,
                        items = null,
                        priority = "important",
                        dropdown = null,
                        hint = null
                    ),
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
                    ),
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
                ),
            contextValues = null
        )
    }

    private fun createGeneratorWithConditionalFields(): NxGenerator {
        return NxGenerator(
            name = "@nx/react:app",
            schemaPath = "/schemas/app.json",
            data =
                NxGeneratorData(
                    collection = "@nx/react",
                    name = "app",
                    description = "Create a React application",
                    type = "generator",
                    aliases = listOf("application")
                ),
            options =
                listOf(
                    NxOptionWithNoDefault(
                        name = "name",
                        isRequired = true,
                        deprecated = false,
                        description = "Application name",
                        type = "string",
                        enum = null,
                        items = null,
                        priority = "important",
                        dropdown = null,
                        hint = null
                    ),
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
                    ),
                    NxOptionWithStringDefault(
                        default = "/",
                        name = "route",
                        isRequired = false,
                        deprecated = false,
                        description = "Default route path",
                        type = "string",
                        enum = null,
                        items = null,
                        priority = null,
                        dropdown = null,
                        hint = "Only used when routing is enabled"
                    )
                ),
            contextValues = null
        )
    }
}
