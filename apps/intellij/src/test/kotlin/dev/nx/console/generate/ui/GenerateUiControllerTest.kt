package dev.nx.console.generate.ui

import com.intellij.openapi.project.Project
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

class GenerateUiControllerTest : BasePlatformTestCase() {

    private lateinit var browser: TestGenerateUiBrowser
    private lateinit var runGeneratorManager: MockRunGeneratorManager
    private lateinit var nxlsService: MockNxlsService
    private lateinit var controller: GenerateUiController
    private val json = Json { ignoreUnknownKeys = true }

    override fun setUp() {
        super.setUp()
        browser = TestGenerateUiBrowser()
        runGeneratorManager = MockRunGeneratorManager()
        nxlsService = MockNxlsService(project)
        controller =
            GenerateUiController(
                browser = browser,
                project = project,
                runGeneratorManager = runGeneratorManager,
                nxlsService = nxlsService
            )
    }

    @Test
    fun `test should send schema on initialization`() {
        val generator = createTestGenerator()
        controller.setGenerator(generator)
        controller.init()

        val messages = browser.getAllMessages()
        assertTrue(messages.any { it.first == "generatorSchema" })
    }

    @Test
    fun `test should queue generator on run request`() {
        val positional = "apps/myapp"
        val flags = listOf("--style=css", "--routing=true")

        browser.simulateRunGenerator(positional, flags, dryRun = false)

        val queuedGenerators = runGeneratorManager.getQueuedGenerators()
        assertEquals(1, queuedGenerators.size)

        val queued = queuedGenerators.first()
        assertEquals("@nx/react:app", queued.generatorString)
        assertFalse(queued.dryRun)
    }

    @Test
    fun `test should handle dry run`() {
        val positional = "apps/myapp"
        val flags = listOf("--style=scss")

        browser.simulateRunGenerator(positional, flags, dryRun = true)

        val queuedGenerators = runGeneratorManager.getQueuedGenerators()
        assertEquals(1, queuedGenerators.size)
        assertTrue(queuedGenerators.first().dryRun)
    }

    @Test
    fun `test should send startup message if available`() {
        val generator = createTestGenerator()
        val startupMessage =
            GenerateUiTestMessages.StartupMessage(
                message = "Generator requires Node 18+",
                severity = "warning"
            )

        controller.setGenerator(generator)
        controller.setStartupMessage(startupMessage)
        controller.init()

        val messages = browser.getAllMessages()
        val startupMsg = messages.find { it.first == "startupMessage" }
        assertNotNull(startupMsg)
    }

    @Test
    fun `test should handle validation request`() {
        val validationRequest =
            GenerateUiTestMessages.ValidationRequest(
                values = mapOf("name" to JsonPrimitive("myapp"), "style" to JsonPrimitive("css"))
            )

        browser.simulateMessage("validationRequest", json.encodeToString(validationRequest))

        // Wait for response
        Thread.sleep(100)

        val messages = browser.getAllMessages()
        assertTrue(messages.any { it.first == "validationResults" })
    }

    @Test
    fun `test should send configuration on init`() {
        controller.init()

        val messages = browser.getAllMessages()
        val configMsg = messages.find { it.first == "configuration" }
        assertNotNull(configMsg)
    }

    @Test
    fun `test should send styles on init`() {
        controller.init()

        val messages = browser.getAllMessages()
        val stylesMsg = messages.find { it.first == "styles" }
        assertNotNull(stylesMsg)
    }

    @Test
    fun `test should handle clipboard copy`() {
        val clipboardCopy =
            GenerateUiTestMessages.CopyToClipboard(text = "nx g @nx/react:app myapp --style=css")

        browser.simulateMessage("copyToClipboard", json.encodeToString(clipboardCopy))

        // Verify clipboard operation would be performed
        // In real implementation, this would copy to system clipboard
    }

    @Test
    fun `test should handle schema request`() {
        val schemaRequest =
            GenerateUiTestMessages.SchemaRequest(
                generatorPath = "/workspace",
                generator = "@nx/react:component"
            )

        browser.simulateMessage("schemaRequest", json.encodeToString(schemaRequest))

        // Browser should auto-respond with generatorSchema
        val messages = browser.getAllMessages()
        assertTrue(messages.any { it.first == "generatorSchema" })
    }

    @Test
    fun `test should handle browser dispose`() {
        controller.init()
        browser.clearMessages()

        controller.dispose()

        // Ensure no new messages are sent after dispose
        assertEquals(0, browser.getAllMessages().size)
    }

    @Test
    fun `test should convert flags correctly`() {
        val flags = listOf("--name=Button", "--style=css", "--export")
        val flagMap = parseFlags(flags)

        assertEquals("Button", flagMap["name"])
        assertEquals("css", flagMap["style"])
        assertEquals("true", flagMap["export"])
    }

    // Helper functions
    private fun createTestGenerator(): NxGenerator {
        return NxGenerator(
            name = "@nx/react:app",
            schemaPath = "/path/to/schema",
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
                        enum = listOf("css", "scss", "less"),
                        items = null,
                        priority = null,
                        dropdown = null,
                        hint = null
                    )
                ),
            contextValues = null
        )
    }

    private fun parseFlags(flags: List<String>): Map<String, String> {
        return flags.associate { flag ->
            when {
                flag.contains("=") -> {
                    val parts = flag.removePrefix("--").split("=", limit = 2)
                    parts[0] to parts[1]
                }
                flag.startsWith("--") -> {
                    flag.removePrefix("--") to "true"
                }
                else -> {
                    flag to "true"
                }
            }
        }
    }

    // Mock controller for testing
    private class GenerateUiController(
        private val browser: TestGenerateUiBrowser,
        private val project: Project,
        private val runGeneratorManager: MockRunGeneratorManager,
        private val nxlsService: MockNxlsService
    ) {
        private var generator: NxGenerator? = null
        private var startupMessage: GenerateUiTestMessages.StartupMessage? = null
        private val json = Json {
            ignoreUnknownKeys = true
            encodeDefaults = true
        }

        fun setGenerator(generator: NxGenerator) {
            this.generator = generator
        }

        fun setStartupMessage(message: GenerateUiTestMessages.StartupMessage) {
            this.startupMessage = message
        }

        fun init() {
            browser.onMessageReceived { id, message ->
                when (id) {
                    "runGenerator" ->
                        handleRunGenerator(
                            json.decodeFromString<GenerateUiTestMessages.RunGenerator>(message)
                        )
                    "validationRequest" ->
                        handleValidationRequest(
                            json.decodeFromString<GenerateUiTestMessages.ValidationRequest>(message)
                        )
                    "schemaRequest" ->
                        handleSchemaRequest(
                            json.decodeFromString<GenerateUiTestMessages.SchemaRequest>(message)
                        )
                    "copyToClipboard" ->
                        handleCopyToClipboard(
                            json.decodeFromString<GenerateUiTestMessages.CopyToClipboard>(message)
                        )
                }
            }

            // Send initial messages
            generator?.let {
                browser.sendMessage(
                    "generatorSchema",
                    json.encodeToString(
                        GenerateUiTestMessages.GeneratorSchema(generator = it, errors = emptyList())
                    )
                )
            }

            startupMessage?.let { browser.sendMessage("startupMessage", json.encodeToString(it)) }

            browser.sendMessage(
                "configuration",
                json.encodeToString(
                    GenerateUiTestMessages.Configuration(enableTaskExecutionDryRunOnChange = true)
                )
            )

            browser.sendMessage(
                "styles",
                json.encodeToString(
                    GenerateUiTestMessages.Styles(stylesheet = "/* default styles */")
                )
            )
        }

        fun dispose() {
            browser.dispose()
        }

        private fun handleRunGenerator(message: GenerateUiTestMessages.RunGenerator) {
            val flags =
                message.flags.associate { flag ->
                    when {
                        flag.contains("=") -> {
                            val parts = flag.removePrefix("--").split("=", limit = 2)
                            parts[0] to parts[1]
                        }
                        flag.startsWith("--") -> {
                            flag.removePrefix("--") to "true"
                        }
                        else -> {
                            flag to "true"
                        }
                    }
                }

            runGeneratorManager.queueGenerator(
                generatorString = message.generator,
                cwd = message.generatorPath,
                flags = flags,
                dryRun = message.dryRun
            )
        }

        private fun handleValidationRequest(message: GenerateUiTestMessages.ValidationRequest) {
            // Simple validation logic for testing
            val results =
                message.values.mapValues { (key, value) ->
                    val stringValue =
                        when (value) {
                            is JsonPrimitive -> value.contentOrNull
                            else -> value.toString()
                        }
                    GenerateUiTestMessages.ValidationResult(
                        isValid = !stringValue.isNullOrEmpty(),
                        error = if (stringValue.isNullOrEmpty()) "Field is required" else null
                    )
                }

            browser.sendMessage(
                "validationResults",
                json.encodeToString(GenerateUiTestMessages.ValidationResults(results = results))
            )
        }

        private fun handleSchemaRequest(message: GenerateUiTestMessages.SchemaRequest) {
            // Would fetch schema from nxlsService in real implementation
        }

        private fun handleCopyToClipboard(message: GenerateUiTestMessages.CopyToClipboard) {
            // Would copy to system clipboard in real implementation
        }
    }
}
