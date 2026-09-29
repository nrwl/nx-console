package dev.nx.console.nxls

import com.intellij.openapi.Disposable
import com.intellij.openapi.editor.Document
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspServer
import com.intellij.platform.lsp.api.LspServerManager
import com.intellij.platform.lsp.api.LspServerState
import dev.nx.console.nxls.server.NxlsLanguageServer
import java.lang.reflect.Proxy
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.CopyOnWriteArrayList
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.future.await
import org.eclipse.lsp4j.InitializeResult
import org.eclipse.lsp4j.ServerCapabilities
import org.eclipse.lsp4j.TextDocumentIdentifier
import org.eclipse.lsp4j.jsonrpc.Endpoint
import org.eclipse.lsp4j.jsonrpc.services.ServiceEndpoints
import org.eclipse.lsp4j.services.LanguageServer

internal class PlatformLspTestHarness(val project: Project, var root: VirtualFile) {
    var trusted = true
    var trustCallback: ((Project) -> Unit)? = null
    val servers = CopyOnWriteArrayList<TestLspServer>()
    val registeredServers = CopyOnWriteArrayList<TestLspServer>()
    val pendingStarts = ConcurrentLinkedQueue<NxlsServerDescriptor>()
    val pendingLaunches = ConcurrentLinkedQueue<TestLspServer>()
    val launchedDescriptors = CopyOnWriteArrayList<NxlsServerDescriptor>()
    val lifecycleTasks = ConcurrentLinkedQueue<() -> Unit>()
    val descriptors = CopyOnWriteArrayList<NxlsServerDescriptor>()
    var delayStopCallbacks = false
    val pendingStops = ConcurrentLinkedQueue<() -> Unit>()
    var stops = 0
    var onStop: (() -> Unit)? = null
    var onStart: ((TestLspServer) -> Unit)? = null
    val manager =
        Proxy.newProxyInstance(
            LspServerManager::class.java.classLoader,
            arrayOf(LspServerManager::class.java),
        ) { _, method, args ->
            when (method.name) {
                "getServersForProvider" -> registeredServers.toList()
                "ensureServerStarted" -> {
                    pendingStarts.add(args!![1] as NxlsServerDescriptor)
                    Unit
                }
                "stopServers" -> {
                    stops++
                    for (server in registeredServers.toList()) {
                        registeredServers.remove(server)
                        if (
                            server.state == LspServerState.Initializing ||
                                server.state == LspServerState.Running
                        ) {
                            server.state = LspServerState.ShutdownNormally
                            onStop?.invoke()
                            val stopped = {
                                server.descriptor.lspServerListener.serverStopped(true)
                            }
                            if (delayStopCallbacks) pendingStops.add(stopped) else stopped()
                        }
                    }
                    Unit
                }
                else -> error("Unexpected manager call: ${method.name}")
            }
        } as LspServerManager
    val session =
        NxlsSession(
            project,
            manager,
            { root },
            { trusted },
            { _: Disposable, callback -> trustCallback = callback },
            { task -> lifecycleTasks.add(task) },
        )

    fun runNextStart(): TestLspServer? {
        val descriptor = pendingStarts.poll() ?: return null
        if (
            registeredServers.any { server ->
                val existing = server.descriptor
                existing.javaClass == descriptor.javaClass &&
                    existing.presentableName == descriptor.presentableName &&
                    existing.roots.map { it.path } == descriptor.roots.map { it.path }
            }
        )
            return null
        val server = TestLspServer(project, descriptor)
        descriptors.add(descriptor)
        servers.add(server)
        pendingLaunches.add(server)
        registeredServers.add(server)
        return server
    }

    fun runNextLaunch() {
        val server = pendingLaunches.poll() ?: return
        val descriptor = server.descriptor
        try {
            descriptor.checkBeforeStart()
            launchedDescriptors.add(descriptor)
            onStart?.invoke(server)
        } catch (_: ProcessCanceledException) {
            // A failed connector construction is retained even without a listener callback.
            if (
                server.state == LspServerState.Initializing ||
                    server.state == LspServerState.Running
            ) {
                server.state = LspServerState.ShutdownUnexpectedly
            }
        }
    }

    fun deliverStopCallbacks() {
        while (true) (pendingStops.poll() ?: return).invoke()
    }

    fun runLifecycleTasks() {
        while (true) (lifecycleTasks.poll() ?: return).invoke()
    }

    fun runPendingTasks() {
        repeat(100) {
            runLifecycleTasks()
            when {
                pendingStarts.isNotEmpty() -> runNextStart()
                pendingLaunches.isNotEmpty() -> runNextLaunch()
                else -> return
            }
        }
        error("Lifecycle did not settle")
    }

    fun latestServer(): TestLspServer {
        runPendingTasks()
        return servers.last()
    }

    fun start(): TestLspServer {
        session.start()
        return latestServer()
    }

    fun ready(server: TestLspServer = latestServer()): TestLspServer {
        server.state = LspServerState.Running
        server.descriptor.lspServerListener.serverInitialized(server.initializeResult)
        return server
    }

    fun die(server: TestLspServer = servers.last()) {
        server.state = LspServerState.ShutdownUnexpectedly
        server.descriptor.lspServerListener.serverStopped(false)
    }
}

internal class TestLspServer(
    override val project: Project,
    override val descriptor: NxlsServerDescriptor,
) : LspServer {
    override val providerClass = NxlsServerSupportProvider::class.java
    override var state = LspServerState.Initializing
    override val initializeResult = InitializeResult(ServerCapabilities())
    var senderEscaped = false
    var sends = 0
    var effects = 0
    var decline = false
    var queued = false
    var beforeInvoke: (() -> Unit)? = null
    var response = CompletableFuture<Any?>()
    var failure: Throwable? = null
    var queuedSender: (() -> Unit)? = null
    private val neverCompletes = CompletableDeferred<Unit>()
    private val remote =
        ServiceEndpoints.toServiceObject(
            object : Endpoint {
                override fun request(method: String, parameter: Any?): CompletableFuture<Any?> {
                    effects++
                    failure?.let { throw it }
                    return response
                }

                override fun notify(method: String, parameter: Any?) {
                    effects++
                }
            },
            NxlsLanguageServer::class.java,
        )

    @Suppress("UNCHECKED_CAST")
    override suspend fun <T> sendRequest(lsp4jSender: (LanguageServer) -> CompletableFuture<T>): T {
        sends++
        if (decline) return null as T
        if (queued) {
            queuedSender = { lsp4jSender(remote) }
            neverCompletes.await()
        }
        beforeInvoke?.invoke()
        val future =
            try {
                lsp4jSender(remote)
            } catch (error: Throwable) {
                senderEscaped = true
                neverCompletes.await()
                throw error
            }
        return future.await()
    }

    override fun sendNotification(lsp4jSender: (LanguageServer) -> Unit) = lsp4jSender(remote)

    override fun <T> sendRequestSync(
        timeoutInMilliseconds: Int,
        lsp4jSender: (LanguageServer) -> CompletableFuture<T>,
    ): T = error("Must not block")

    override fun getDocumentIdentifier(file: VirtualFile) = TextDocumentIdentifier(file.url)

    override fun getDocumentVersion(document: Document) = 0
}
