package dev.nx.console.nxls

import dev.nx.console.utils.NxConsoleLogger
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.job
import kotlinx.coroutines.launch

private val log by lazy { NxConsoleLogger.getInstance() }

/**
 * Serializes outbound LSP notifications onto a background thread.
 *
 * Handing a message to lsp4j writes it straight into the language server process' stdin pipe and
 * blocks for as long as the server does not drain that pipe, so these sends must never happen on
 * the EDT. The single consumer keeps messages in submission order, which LSP text synchronization
 * relies on: a `didChange` may not overtake the `didOpen` for the same document.
 */
class LspNotificationQueue(scope: CoroutineScope) {

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
                    runCatching { log.error("Error sending a notification to nxls", e) }
                }
            }
        }
        // Pending sends capture the document they describe, so they must not outlive the scope.
        scope.coroutineContext.job.invokeOnCompletion { queue.close() }
    }

    fun submit(send: () -> Unit) {
        if (queue.trySend(send).isFailure) {
            log.log("nxls notification dropped, the queue no longer accepts messages")
        }
    }
}
