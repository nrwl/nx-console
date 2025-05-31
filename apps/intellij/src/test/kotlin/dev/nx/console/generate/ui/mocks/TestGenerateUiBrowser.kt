package dev.nx.console.generate.ui.mocks

import dev.nx.console.generate.ui.GenerateUiTestMessages
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class TestGenerateUiBrowser {
    private var messageHandler: ((String, String) -> Unit)? = null
    private val messageQueue = mutableListOf<Pair<String, String>>()
    private val json = Json { ignoreUnknownKeys = true }

    fun init(bundlePath: String) {
        // Initialize test browser
    }

    fun dispose() {
        messageHandler = null
        messageQueue.clear()
    }

    fun sendMessage(id: String, message: String) {
        messageQueue.add(id to message)

        // Auto-respond to certain messages for testing
        when (id) {
            "schemaRequest" -> {
                val request = json.decodeFromString<GenerateUiTestMessages.SchemaRequest>(message)
                // Simulate a response back
                messageHandler?.invoke("generatorSchema", "{}")
            }
            "validationRequest" -> {
                messageHandler?.invoke(
                    "validationResults",
                    json.encodeToString(
                        GenerateUiTestMessages.ValidationResults(
                            results =
                                mapOf(
                                    "test" to
                                        GenerateUiTestMessages.ValidationResult(
                                            isValid = true,
                                            error = null
                                        )
                                )
                        )
                    )
                )
            }
        }
    }

    fun onMessageReceived(handler: (String, String) -> Unit) {
        messageHandler = handler
    }

    // Test helpers
    fun getLastMessage(): Pair<String, String>? = messageQueue.lastOrNull()

    fun getAllMessages(): List<Pair<String, String>> = messageQueue.toList()

    fun clearMessages() = messageQueue.clear()

    fun simulateMessage(id: String, message: String) {
        messageHandler?.invoke(id, message)
    }

    fun simulateRunGenerator(positional: String, flags: List<String>, dryRun: Boolean = false) {
        val message =
            GenerateUiTestMessages.RunGenerator(
                positional = positional,
                flags = flags,
                generator = "@nx/react:app",
                dryRun = dryRun,
                generatorPath = "/workspace"
            )
        simulateMessage("runGenerator", json.encodeToString(message))
    }
}
