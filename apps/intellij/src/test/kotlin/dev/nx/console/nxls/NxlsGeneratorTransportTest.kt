package dev.nx.console.nxls

import dev.nx.console.generate.ui.GeneratorSchema
import dev.nx.console.models.NxOptionWithBooleanDefault
import dev.nx.console.nxls.server.NxlsLanguageServer
import dev.nx.console.nxls.server.requests.NxGeneratorOptionsRequest
import dev.nx.console.nxls.server.requests.NxGeneratorOptionsRequestOptions
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals
import kotlin.test.assertIs
import org.eclipse.lsp4j.jsonrpc.Launcher
import org.junit.Test

class NxlsGeneratorTransportTest {
    @Test
    fun launcherDeliversRawGeneratorResponsesWithoutCustomGson() {
        val responses =
            listOf(
                    NxlsResponseDecoderTest.generatorsJson,
                    NxlsResponseDecoderTest.optionsJson,
                    NxlsResponseDecoderTest.schemaJson,
                )
                .mapIndexed { index, json ->
                    val body =
                        """{"jsonrpc":"2.0","id":${index + 1},"result":$json}"""
                            .toByteArray(Charsets.UTF_8)
                    "Content-Length: ${body.size}\r\n\r\n".toByteArray(Charsets.UTF_8) + body
                }
                .fold(ByteArray(0)) { all, message -> all + message }
        val executor = Executors.newCachedThreadPool()
        try {
            val launcher =
                Launcher.Builder<NxlsLanguageServer>()
                    .setRemoteInterface(NxlsLanguageServer::class.java)
                    .setLocalService(Any())
                    .setInput(ByteArrayInputStream(responses))
                    .setOutput(ByteArrayOutputStream())
                    .setExecutorService(executor)
                    .create()
            val server = launcher.remoteProxy
            val generators = server.generators()
            val options =
                server.generatorOptions(
                    NxGeneratorOptionsRequest(
                        NxGeneratorOptionsRequestOptions("@nx/js", "library", "libs")
                    )
                )
            val schema =
                server.transformedGeneratorSchema(
                    GeneratorSchema("@nx/js", "library", "Create a library", emptyList(), null)
                )
            val listening = launcher.startListening()
            val decoder = NxlsResponseDecoder()
            assertEquals(
                5,
                checkNotNull(decoder.generators(generators.get(5, TimeUnit.SECONDS)))
                    .single()
                    .options
                    ?.size,
            )
            val decodedOptions =
                checkNotNull(decoder.generatorOptions(options.get(5, TimeUnit.SECONDS)))
            assertEquals(true, assertIs<NxOptionWithBooleanDefault>(decodedOptions[2]).default)
            assertEquals(
                5,
                checkNotNull(decoder.transformedGeneratorSchema(schema.get(5, TimeUnit.SECONDS)))
                    .options
                    .size,
            )
            listening.get(5, TimeUnit.SECONDS)
        } finally {
            executor.shutdownNow()
        }
    }
}
