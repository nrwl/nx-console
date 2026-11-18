package dev.nx.console.utils.jcef

import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Test

class HtmlEscapingTest {
    private val breakout = """');alert(1);//"</script><img src=x onerror=alert(2)>"""

    @Test
    fun escapeHtmlLeavesNoMarkup() {
        val escaped = escapeHtml(breakout)

        assertFalse(escaped.contains('<'))
        assertFalse(escaped.contains('>'))
        assertFalse(escaped.contains('"'))
        assertFalse(escaped.contains('\''))
        assertEquals("a &amp; b", escapeHtml("a & b"))
    }

    @Test
    fun jsStringLiteralIsASingleStringThatRoundTrips() {
        val literal = jsStringLiteral(breakout)

        assertFalse(literal.contains("</script>", ignoreCase = true))
        assertEquals(breakout, Json.parseToJsonElement(literal).jsonPrimitive.content)
    }

    @Test
    fun jsStringLiteralEscapesBackslashesAndNewlines() {
        val text = "a\\b\nc d"
        assertEquals(text, Json.parseToJsonElement(jsStringLiteral(text)).jsonPrimitive.content)
    }

    @Test
    fun escapeScriptTagKeepsJsonValid() {
        val json = """{"command":${JsonPrimitive(breakout)}}"""
        val escaped = escapeScriptTag(json)

        assertFalse(escaped.contains("</script>", ignoreCase = true))
        assertEquals(Json.parseToJsonElement(json), Json.parseToJsonElement(escaped))
    }
}
