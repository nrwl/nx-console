package dev.nx.console.nxls

import dev.nx.console.nxls.server.NxlsLanguageServer
import java.util.concurrent.CompletableFuture
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.selects.select
import kotlinx.coroutines.supervisorScope
import kotlinx.coroutines.withTimeoutOrNull

internal interface NxlsRequestSender {
    suspend fun <T> request(sender: (NxlsLanguageServer) -> CompletableFuture<T>): T?
}

class NxlsRequestAdapter
internal constructor(private val getSession: () -> NxlsSession, private val nowMillis: () -> Long) :
    NxlsRequestSender {
    internal constructor(session: NxlsSession, nowMillis: () -> Long) : this({ session }, nowMillis)

    constructor(session: NxlsSession) : this({ session })

    internal constructor(
        getSession: () -> NxlsSession
    ) : this(getSession, { System.nanoTime() / 1_000_000 })

    private val session: NxlsSession
        get() = getSession()

    override suspend fun <T> request(sender: (NxlsLanguageServer) -> CompletableFuture<T>): T? {
        val deadline = nowMillis() + 10_000
        session.ensureStarted()
        while (true) {
            val remaining = deadline - nowMillis()
            if (remaining <= 0) return null
            val running =
                withTimeoutOrNull(remaining) {
                    session.ready.filterNotNull().first { session.isCurrent(it) }
                } ?: return null
            val invoked = AtomicBoolean()
            val outcome = supervisorScope {
                val response = async {
                    running.server.sendRequest { server ->
                        invoked.set(true)
                        try {
                            if (session.isCurrent(running)) sender(server as NxlsLanguageServer)
                            else CompletableFuture.failedFuture(GenerationEnded())
                        } catch (error: Throwable) {
                            // Escaping on the platform executor would abandon its response future.
                            CompletableFuture.failedFuture(error)
                        }
                    }
                }
                try {
                    // Queued platform requests can be abandoned without completing their futures.
                    select {
                        running.ended.onAwait { Outcome<T>(null, true) }
                        response.onAwait { Outcome(it, false) }
                    }
                } catch (_: GenerationEnded) {
                    Outcome<T>(null, true)
                } finally {
                    response.cancel()
                }
            }
            if (outcome.ended || invoked.get()) return outcome.value
            session.dispatchDeclined(running)
        }
    }

    private class GenerationEnded : RuntimeException()

    private class Outcome<T>(val value: T?, val ended: Boolean)
}
