package dev.nx.console.nxls

import dev.nx.console.utils.NxConsoleLogger
import java.util.function.Function
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.job
import kotlinx.coroutines.launch
import org.eclipse.lsp4j.jsonrpc.MessageConsumer
import org.eclipse.lsp4j.jsonrpc.json.StreamMessageConsumer

private val log by lazy { NxConsoleLogger.getInstance() }

/**
 * Serializes everything Nx Console sends to nxls onto a background thread.
 *
 * Handing a message to lsp4j writes it straight into the language server process' stdin pipe and
 * blocks for as long as the server does not drain that pipe, so these sends must never happen on
 * the EDT.
 *
 * The single consumer keeps messages in submission order. Notifications need that because LSP text
 * synchronization is stateful: a `didChange` may not overtake the `didOpen` for the same document.
 * Requests travel here for the same reason, since one that overtook a queued edit would be answered
 * against text the server has not seen. A request's reply still arrives on lsp4j's own thread; only
 * the send is ordered here.
 */
class LspMessageQueue(scope: CoroutineScope) {

    private val queue = Channel<() -> Unit>(Channel.UNLIMITED)

    init {
        scope.launch(Dispatchers.IO) {
            for (send in queue) {
                try {
                    send()
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Throwable) {
                    // Logging an error is itself allowed to throw, and losing this consumer would
                    // silently stop every later message, so nothing here may escape.
                    runCatching { log.error("Error sending a message to nxls", e) }
                }
            }
        }
        // Pending sends capture the document they describe, so they must not outlive the scope.
        scope.coroutineContext.job.invokeOnCompletion { queue.close() }
    }

    fun submit(send: () -> Unit) {
        if (queue.trySend(send).isFailure) {
            log.log("Message to nxls dropped, the queue no longer accepts them")
        }
    }

    internal fun offload(consumer: MessageConsumer): MessageConsumer = MessageConsumer { message ->
        submit { consumer.consume(message) }
    }
}

/**
 * Builds the message consumer wrapper a launcher talking to nxls must be created with.
 *
 * This is the only place that decides what leaves the caller's thread, so every message reaches the
 * server the same way and no call site can opt out by accident. [decorate] adds anything that
 * should run per message, such as logging, and runs wherever the message ends up being sent from.
 *
 * lsp4j applies this wrapper to both directions. Only the consumer that writes into the server's
 * stdin can block its caller, so only that one is moved onto [queue]; deferring inbound delivery
 * would stall the server's replies behind our own sends.
 */
fun nxlsMessageConsumerWrapper(
    queue: LspMessageQueue,
    decorate: (MessageConsumer) -> MessageConsumer = { it },
): Function<MessageConsumer, MessageConsumer> = Function { consume ->
    val deliver = decorate(consume)
    if (consume is StreamMessageConsumer) queue.offload(deliver) else deliver
}
