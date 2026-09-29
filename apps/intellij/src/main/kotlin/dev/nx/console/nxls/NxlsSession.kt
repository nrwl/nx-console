package dev.nx.console.nxls

import com.intellij.ide.trustedProjects.TrustedProjects
import com.intellij.ide.trustedProjects.TrustedProjectsListener
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspServer
import com.intellij.platform.lsp.api.LspServerManager
import com.intellij.platform.lsp.api.LspServerState
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

@Service(Service.Level.PROJECT)
class NxlsSession
internal constructor(
    private val project: Project,
    private val manager: LspServerManager,
    private val resolveRoot: () -> VirtualFile?,
    private val isTrusted: () -> Boolean,
    private val whenTrusted: (Disposable, (Project) -> Unit) -> Unit,
) : Disposable {
    constructor(
        project: Project
    ) : this(
        project,
        LspServerManager.getInstance(project),
        { NxlsWorkspaceRootResolver.getInstance(project).resolve() },
        { TrustedProjects.isProjectTrusted(project) },
        { disposable, callback ->
            TrustedProjectsListener.onceWhenProjectTrusted(disposable, callback)
        },
    )

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
            synchronized(this) {
                if (!disposed) {
                    if (trustedProject === project) {
                        if (requested) ensureStarted()
                    } else {
                        registerTrustListener()
                    }
                }
            }
        }
    }

    fun start() = ensureStarted()

    @Synchronized
    internal fun ensureStarted(
        starter: (NxlsServerDescriptor) -> Unit = {
            manager.ensureServerStarted(NxlsServerSupportProvider::class.java, it)
        }
    ) {
        if (disposed || project.isDisposed) return
        requested = true
        if (!isTrusted()) return
        val generation =
            current
                ?: run {
                    val root = workspaceRoot ?: resolveRoot() ?: return
                    Generation(NxlsServerDescriptor(project, root, ++nextGeneration, this)).also {
                        current = it
                    }
                }
        if (!generation.startRequested) {
            generation.startRequested = true
            try {
                starter(generation.descriptor)
            } catch (error: Throwable) {
                retire()
                throw error
            }
        }
    }

    @Synchronized
    fun stop() {
        requested = false
        retire()
        manager.stopServers(NxlsServerSupportProvider::class.java)
    }

    @Synchronized
    fun restart() {
        stop()
        ensureStarted()
    }

    @Synchronized
    fun changeWorkspace(root: VirtualFile) {
        stop()
        workspaceRoot = root
        ensureStarted()
    }

    @Synchronized
    internal fun serverInitialized(generation: Long) {
        val active = current?.takeIf { it.descriptor.generation == generation } ?: return
        val server =
            manager.getServersForProvider(NxlsServerSupportProvider::class.java).firstOrNull {
                it.descriptor === active.descriptor && it.state == LspServerState.Running
            } ?: return
        readiness.value = NxlsRunningGeneration(generation, server, active.ended)
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
        current?.descriptor === running.server.descriptor &&
            !running.ended.isCompleted &&
            running.server.state == LspServerState.Running &&
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
    }

    @Synchronized
    override fun dispose() {
        disposed = true
        requested = false
        retire()
    }

    private class Generation(val descriptor: NxlsServerDescriptor) {
        val ended = CompletableDeferred<Unit>()
        var startRequested = false
    }

    companion object {
        fun getInstance(project: Project): NxlsSession = project.getService(NxlsSession::class.java)
    }
}

internal class NxlsRunningGeneration(
    val generation: Long,
    val server: LspServer,
    val ended: Deferred<Unit>,
)
