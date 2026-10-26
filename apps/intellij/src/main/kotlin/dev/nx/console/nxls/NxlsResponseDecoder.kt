package dev.nx.console.nxls

import com.google.gson.GsonBuilder
import com.google.gson.JsonElement
import com.google.gson.JsonParseException
import com.google.gson.reflect.TypeToken
import dev.nx.console.generate.ui.GeneratorSchema
import dev.nx.console.models.NxGenerator
import dev.nx.console.models.NxGeneratorOption
import dev.nx.console.models.NxGeneratorOptionDeserializer
import org.eclipse.lsp4j.jsonrpc.MessageIssueException
import org.eclipse.lsp4j.jsonrpc.messages.MessageIssue
import org.eclipse.lsp4j.jsonrpc.messages.ResponseErrorCode
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage

class NxlsResponseDecoder {
    private val gson =
        GsonBuilder()
            .registerTypeAdapter(NxGeneratorOption::class.java, NxGeneratorOptionDeserializer())
            .create()

    fun generators(response: JsonElement): List<NxGenerator>? =
        decode(response, object : TypeToken<List<NxGenerator>>() {})

    fun generatorOptions(response: JsonElement): List<NxGeneratorOption>? =
        decode(response, object : TypeToken<List<NxGeneratorOption>>() {})

    fun transformedGeneratorSchema(response: JsonElement): GeneratorSchema? =
        decode(response, object : TypeToken<GeneratorSchema>() {})

    private fun <T> decode(response: JsonElement, type: TypeToken<T>): T? {
        return try {
            gson.fromJson(response, type.type)
        } catch (e: JsonParseException) {
            throw MessageIssueException(
                ResponseMessage().apply { result = response },
                MessageIssue(
                    "Response could not be decoded.",
                    ResponseErrorCode.ParseError.value,
                    e,
                ),
            )
        }
    }
}
