package dev.nx.console.nxls

import com.intellij.ide.trustedProjects.TrustedProjects
import com.intellij.ide.trustedProjects.TrustedProjectsListener
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.readAction
import com.intellij.openapi.components.Service
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspClient
import com.intellij.platform.lsp.api.LspClientManager
import com.intellij.platform.lsp.api.LspServerState
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

@Service(Service.Level.PROJECT)
class NxlsSession
internal constructor(
    private val project: Project,
    private val manager: LspClientManager,
    private val resolveRoot: () -> VirtualFile?,
    private val isTrusted: () -> Boolean,
    private val whenTrusted: (Disposable, (Project) -> Unit) -> Unit,
    private val scheduleReconciliationTask: ((() -> Unit) -> Unit)? = null,
) : Disposable {
    constructor(
        project: Project
    ) : this(
        project,
        LspClientManager.getInstance(project),
        { NxlsWorkspaceRootResolver.getInstance(project).resolve() },
        { TrustedProjects.isProjectTrusted(project) },
        { disposable, callback ->
            TrustedProjectsListener.onceWhenProjectTrusted(disposable, callback)
        },
    )

    private val reconciliationMutex = Mutex()
    private var nextGeneration = 0L
    private var current: Generation? = null
    private var requested = false
    private var disposed = false
    private var workspaceRoot: VirtualFile? = null
    private val readiness = MutableStateFlow<NxlsRunningGeneration?>(null)
    internal val ready = readiness.asStateFlow()

    init {
        registerTrustListener()
    }

    private fun registerTrustListener() {
        whenTrusted(this) { trustedProject ->
            val waiting =
                synchronized(this) {
                    if (disposed) return@whenTrusted
                    if (trustedProject === project && requested && isTrusted()) {
                        if (current == null) current = newGeneration()
                        true
                    } else false
                }
            if (waiting) scheduleReconciliation()
            else if (trustedProject !== project) registerTrustListener()
        }
    }

    fun start() = ensureStarted()

    internal fun ensureStarted() {
        descriptorForDiscovery() ?: return
        scheduleReconciliation()
    }

    @Synchronized
    internal fun descriptorForDiscovery(): NxlsClientDescriptor? {
        if (disposed || project.isDisposed) return null
        requested = true
        if (!isTrusted()) return null
        val active = current
        if (active != null) {
            val client =
                manager.getClients(NxlsIntegrationProvider::class.java).firstOrNull {
                    it.descriptor === active.descriptor
                }
            if (client != null) active.client = client
            // Discovery may run before the removed client's asynchronous shutdown callback.
            // Widget restarts retire synchronously; an unobserved descriptor may still await
            // its first registration.
            if (
                active.client != null &&
                    (client == null ||
                        client.state == LspServerState.ShutdownNormally ||
                        client.state == LspServerState.ShutdownUnexpectedly)
            ) {
                retire()
            }
        }
        return (current ?: newGeneration()?.also { current = it })?.descriptor
    }

    private fun newGeneration(
        root: VirtualFile? = workspaceRoot ?: resolveRoot(),
        refreshed: CompletableDeferred<Unit> = CompletableDeferred(),
    ): Generation? =
        root?.let {
            Generation(NxlsClientDescriptor(project, it, ++nextGeneration, this), refreshed)
        }

    fun stop() {
        synchronized(this) {
            requested = false
            retire()
        }
        scheduleReconciliation()
    }

    fun restart() {
        replaceGeneration()
    }

    internal fun restartWithRefreshTicket(): Deferred<Unit> = replaceGeneration()

    fun changeWorkspace(root: VirtualFile) {
        replaceGeneration(root)
    }

    private fun replaceGeneration(root: VirtualFile? = null): Deferred<Unit> {
        val ticket =
            synchronized(this) {
                retire()
                if (root != null) workspaceRoot = root
                requested = !disposed && !project.isDisposed
                current = if (requested) newGeneration() else null
                current?.refreshed
                    ?: CompletableDeferred<Unit>().also {
                        it.cancel(CancellationException("Nx workspace is unavailable"))
                    }
            }
        scheduleReconciliation()
        return ticket
    }

    private fun scheduleReconciliation() {
        if (scheduleReconciliationTask != null) {
            scheduleReconciliationTask.invoke(::reconcile)
        } else if (!project.isDisposed) {
            ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
                reconciliationMutex.withLock {
                    // Registration is an EDT write action. This also waits for a launch hook's
                    // client to be registered before inspecting the platform's collection.
                    readAction { reconcile() }
                }
            }
        }
    }

    private fun reconcile() {
        if (project.isDisposed) return
        val clients = manager.getClients(NxlsIntegrationProvider::class.java)
        val removeRetired =
            synchronized(this) {
                val active = current
                if (active != null) {
                    clients
                        .firstOrNull { it.descriptor === active.descriptor }
                        ?.let { active.client = it }
                }
                val obsolete = clients.any { it.descriptor !== active?.descriptor }
                if (obsolete) {
                    // stopClients removes every client for this provider. If a different-root
                    // late registration overlaps the current client, replace both but keep its
                    // ticket.
                    if (active != null && clients.any { it.descriptor === active.descriptor }) {
                        active.ended.complete(Unit)
                        readiness.value = null
                        current = newGeneration(active.descriptor.root, active.refreshed)
                    }
                    current?.startRequested = false
                }
                obsolete
            }
        if (removeRetired) manager.stopClients(NxlsIntegrationProvider::class.java)
        val active =
            synchronized(this) {
                current
                    ?.takeIf {
                        !disposed &&
                            requested &&
                            isTrusted() &&
                            !it.startRequested &&
                            (removeRetired ||
                                clients.none { client -> client.descriptor === it.descriptor })
                    }
                    ?.also { it.startRequested = true }
            } ?: return
        try {
            manager.ensureClientStarted(NxlsIntegrationProvider::class.java, active.descriptor)
        } catch (error: Throwable) {
            synchronized(this) { active.startRequested = false }
            throw error
        }
    }

    internal fun beforeStart(generation: Long) {
        val allowed =
            synchronized(this) {
                val active = current?.takeIf { it.descriptor.generation == generation }
                if (active != null) {
                    manager
                        .getClients(NxlsIntegrationProvider::class.java)
                        .firstOrNull { it.descriptor === active.descriptor }
                        ?.let { active.client = it }
                }
                !disposed && !project.isDisposed && requested && active != null
            }
        // A queued start can register after retirement, even if stopClients saw no clients.
        // Reconcile off the connector callback stack, including when launch is rejected.
        scheduleReconciliation()
        if (!allowed) throw ProcessCanceledException()
    }

    @Synchronized
    internal fun serverInitialized(generation: Long) {
        val active = current?.takeIf { it.descriptor.generation == generation } ?: return
        val client =
            manager.getClients(NxlsIntegrationProvider::class.java).firstOrNull {
                it.descriptor === active.descriptor && it.state == LspServerState.Running
            } ?: return
        active.client = client
        if (active.initialized) return
        active.initialized = true
        readiness.value = NxlsRunningGeneration(generation, client, active.ended)
        publishRefresh(active, started = true)
        val buffered = active.bufferedRefresh.toList()
        active.bufferedRefresh.clear()
        for (started in buffered) {
            if (current !== active) break
            publishRefresh(active, started)
        }
    }

    @Synchronized
    internal fun workspaceRefresh(generation: Long, started: Boolean) {
        if (disposed || project.isDisposed) return
        val active = current?.takeIf { it.descriptor.generation == generation } ?: return
        if (!active.initialized) active.bufferedRefresh.add(started)
        else publishRefresh(active, started)
    }

    private fun publishRefresh(active: Generation, started: Boolean) {
        if (started) {
            project.messageBus
                .syncPublisher(NxlsService.NX_WORKSPACE_REFRESH_STARTED_TOPIC)
                .onWorkspaceRefreshStarted()
        } else {
            active.refreshed.complete(Unit)
            project.messageBus
                .syncPublisher(NxlsService.NX_WORKSPACE_REFRESH_TOPIC)
                .onNxWorkspaceRefresh()
        }
    }

    @Synchronized
    internal fun serverStopped(generation: Long) {
        if (current?.descriptor?.generation != generation) return
        retire()
    }

    @Synchronized
    internal fun <T> ifCurrent(generation: Long, action: () -> T): T? {
        if (disposed || project.isDisposed || current?.descriptor?.generation != generation)
            return null
        return action()
    }

    @Synchronized
    internal fun isCurrent(running: NxlsRunningGeneration): Boolean =
        current?.descriptor === running.client.descriptor &&
            !running.ended.isCompleted &&
            running.client.state == LspServerState.Running &&
            !disposed &&
            !project.isDisposed

    @Synchronized
    internal fun dispatchDeclined(running: NxlsRunningGeneration) {
        if (readiness.value === running) readiness.value = null
    }

    private fun retire() {
        val retired = current
        current = null
        readiness.value = null
        retired?.ended?.complete(Unit)
        retired?.refreshed?.cancel(CancellationException("Nx language server generation ended"))
    }

    @Synchronized
    override fun dispose() {
        disposed = true
        requested = false
        retire()
    }

    private class Generation(
        val descriptor: NxlsClientDescriptor,
        val refreshed: CompletableDeferred<Unit> = CompletableDeferred(),
    ) {
        val ended = CompletableDeferred<Unit>()
        val bufferedRefresh = mutableListOf<Boolean>()
        var client: LspClient? = null
        var initialized = false
        var startRequested = false
    }

    companion object {
        fun getInstance(project: Project): NxlsSession = project.getService(NxlsSession::class.java)
    }
}

internal class NxlsRunningGeneration(
    val generation: Long,
    val client: LspClient,
    val ended: Deferred<Unit>,
)
