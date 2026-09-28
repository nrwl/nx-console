package dev.nx.console.nxls

import dev.nx.console.models.NxGeneratorOption
import dev.nx.console.models.NxGeneratorOptionDeserializer
import dev.nx.console.nxls.client.NxlsLanguageClient
import dev.nx.console.nxls.server.NxlsLanguageServer
import java.io.InputStream
import java.io.OutputStream
import java.util.concurrent.ExecutorService
import org.eclipse.lsp4j.jsonrpc.Launcher
import org.eclipse.lsp4j.jsonrpc.MessageConsumer
import org.eclipse.lsp4j.jsonrpc.json.StreamMessageConsumer

/**
 * Builds the lsp4j launcher Nx Console talks to nxls through.
 *
 * Everything that decides how a message reaches the server lives here, so there is one wiring to
 * get right and tests can exercise the same one production uses.
 */
fun createNxlsLauncher(
    client: NxlsLanguageClient,
    input: InputStream?,
    output: OutputStream?,
    executorService: ExecutorService,
    messageQueue: LspMessageQueue,
    decorate: (MessageConsumer) -> MessageConsumer = { it },
): Launcher<NxlsLanguageServer> =
    QueueingLauncherBuilder(messageQueue)
        .setLocalService(client)
        .setRemoteInterface(NxlsLanguageServer::class.java)
        .setInput(input)
        .setOutput(output)
        .setExecutorService(executorService)
        .wrapMessages(decorate)
        .configureGson { gson ->
            gson.registerTypeAdapter(NxGeneratorOption::class.java, NxGeneratorOptionDeserializer())
        }
        .create()

/**
 * Moves the messages we send to nxls off the thread that asked for them.
 *
 * Writing a message goes straight into the server's stdin pipe and blocks for as long as the server
 * does not drain it, which is where the reported UI freezes came from. Overriding the hook lets the
 * direction be read from the *original* consumer, before lsp4j has had a chance to wrap it in a
 * validator or a tracer; deciding from the wrapped consumer instead would silently stop matching
 * the moment either of those is switched on, and the freeze would come back with no error.
 *
 * Only the outbound consumer is moved. Deferring inbound delivery would stall the server's replies
 * behind our own sends.
 */
private class QueueingLauncherBuilder(private val messageQueue: LspMessageQueue) :
    Launcher.Builder<NxlsLanguageServer>() {

    override fun wrapMessageConsumer(consumer: MessageConsumer): MessageConsumer {
        val writesToServer = consumer is StreamMessageConsumer
        val decorated = super.wrapMessageConsumer(consumer)
        return if (writesToServer) messageQueue.offload(decorated) else decorated
    }
}
