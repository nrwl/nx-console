package dev.nx.console.nxls

import com.google.gson.JsonNull
import com.google.gson.JsonParseException
import com.google.gson.JsonParser
import dev.nx.console.models.*
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertIs
import kotlin.test.assertNull
import org.eclipse.lsp4j.jsonrpc.MessageIssueException
import org.eclipse.lsp4j.jsonrpc.messages.ResponseErrorCode
import org.junit.Test

class NxlsResponseDecoderTest {
    private val decoder = NxlsResponseDecoder()

    @Test
    fun generatorOptionsDecodeEveryDefaultVariant() {
        assertOptions(checkNotNull(decoder.generatorOptions(JsonParser.parseString(optionsJson))))
    }

    @Test
    fun generatorsDecodeNestedOptionsAndUnknownFields() {
        val generator =
            checkNotNull(decoder.generators(JsonParser.parseString(generatorsJson))).single()
        assertEquals("@nx/js:library", generator.name)
        assertEquals(
            "/workspace/node_modules/@nx/js/src/generators/library/schema.json",
            generator.schemaPath,
        )
        assertEquals("@nx/js", generator.data.collection)
        assertEquals(listOf("lib"), generator.data.aliases)
        assertOptions(checkNotNull(generator.options))
    }

    @Test
    fun transformedSchemaDecodesDirectOptions() {
        val schema =
            checkNotNull(decoder.transformedGeneratorSchema(JsonParser.parseString(schemaJson)))
        assertEquals("@nx/js", schema.collectionName)
        assertEquals("library", schema.generatorName)
        assertNull(schema.context)
        assertOptions(schema.options)
    }

    @Test
    fun jsonNullRemainsAnAbsentResponse() {
        assertNull(decoder.generators(JsonNull.INSTANCE))
        assertNull(decoder.generatorOptions(JsonNull.INSTANCE))
        assertNull(decoder.transformedGeneratorSchema(JsonNull.INSTANCE))
    }

    @Test
    fun malformedResponsesBecomeMessageIssues() {
        val responses =
            listOf(
                { decoder.generators(JsonParser.parseString("{}")) },
                { decoder.generatorOptions(JsonParser.parseString("[42]")) },
                {
                    decoder.transformedGeneratorSchema(
                        JsonParser.parseString(schemaJson.replace(optionsJson, "false"))
                    )
                },
            )
        responses.forEach { decode ->
            val error = assertFailsWith<MessageIssueException> { decode() }
            assertEquals(ResponseErrorCode.ParseError.value, error.issues.single().issueCode)
            assertIs<JsonParseException>(error.issues.single().cause)
        }
    }

    private fun assertOptions(options: List<NxGeneratorOption>) {
        assertEquals(
            listOf("name", "directory", "strict", "retries", "tags"),
            options.map { it.name },
        )
        val name = assertIs<NxOptionWithNoDefault>(options[0])
        assertEquals(true, name.isRequired)
        assertEquals("Project name", name.description)
        assertEquals("important", name.priority)
        assertEquals("Use a unique name", name.hint)
        assertEquals("libs", assertIs<NxOptionWithStringDefault>(options[1]).default)
        assertEquals(true, assertIs<NxOptionWithBooleanDefault>(options[2]).default)
        assertEquals(3, assertIs<NxOptionWithNumberDefault>(options[3]).default)
        assertEquals(
            listOf("scope:shared", "type:lib"),
            assertIs<NxOptionWithArrayDefault>(options[4]).default,
        )
    }

    companion object {
        internal val optionsJson =
            """[
            {"name":"name","type":"string","isRequired":true,"description":"Project name","x-priority":"important","x-hint":"Use a unique name","futureField":{"enabled":true}},
            {"name":"directory","type":"string","default":"libs"},
            {"name":"strict","type":"boolean","default":true},
            {"name":"retries","type":"number","default":3},
            {"name":"tags","type":"array","default":["scope:shared","type:lib"]}
        ]"""
        internal val generatorsJson =
            """[{
            "name":"@nx/js:library",
            "schemaPath":"/workspace/node_modules/@nx/js/src/generators/library/schema.json",
            "data":{"collection":"@nx/js","name":"library","description":"Create a library","type":"generator","aliases":["lib"]},
            "options":$optionsJson,"contextValues":null,"futureField":true
        }]"""
        internal val schemaJson =
            """{
            "collectionName":"@nx/js","generatorName":"library","description":"Create a library",
            "options":$optionsJson,"context":null,"futureField":[1,2]
        }"""
    }
}
