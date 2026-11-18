package dev.nx.console.project_details

import dev.nx.console.graph.NxGraphInteractionEvent
import dev.nx.console.project_details.browsers.json
import dev.nx.console.project_details.browsers.oldProjectDetailsJson
import kotlinx.serialization.SerializationException
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Test

class ProjectDetailsJsonTest {
    @Test
    fun malformedMessagesOmitInputFromDiagnostics() {
        val marker = "workspace-diagnostic-marker"
        val message = """{"type": "$marker", "payload": [}"""

        for (decoder in listOf(oldProjectDetailsJson, json)) {
            val error =
                assertThrows(SerializationException::class.java) {
                    decoder.decodeFromString<NxGraphInteractionEvent>(message)
                }
            assertFalse(checkNotNull(error.message).contains(marker))
        }
    }
}
