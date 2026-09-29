@file:Suppress("INVISIBLE_MEMBER", "INVISIBLE_REFERENCE")

package dev.nx.console.nxls

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspServerManager
import com.intellij.platform.lsp.api.LspServerManagerListener
import com.intellij.platform.lsp.api.LspServerState
import com.intellij.platform.lsp.impl.LspServerImpl
import com.intellij.platform.lsp.impl.connector.Lsp4jServerConnector
import java.io.InputStream
import java.io.OutputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.eclipse.lsp4j.InitializeResult
import org.eclipse.lsp4j.ServerCapabilities
import org.eclipse.lsp4j.TextDocumentSyncKind
import org.eclipse.lsp4j.services.LanguageServer

/** Exercises the SDK executor and document synchroniser with a controlled remote endpoint. */
internal class SdkLspTestHarness(project: Project, root: VirtualFile, remote: LanguageServer) :
    AutoCloseable {
    private val lifecycle = PlatformLspTestHarness(project, root)
    val server =
        LspServerImpl(
            NxlsServerSupportProvider::class.java,
            lifecycle.start().descriptor,
            object : LspServerManagerListener {},
        )
    private val connector =
        object : Lsp4jServerConnector(server) {
            override val ideToServerStream: OutputStream
                get() = error("Endpoint already installed")

            override val serverToIdeStream: InputStream
                get() = error("Endpoint already installed")

            override fun prepareConnect() = Unit

            override fun isConnectionAlive() = false

            override fun disconnect() = Unit
        }
    private val manager = LspServerManager.getInstance(project)
    @Suppress("UNCHECKED_CAST")
    private val servers =
        manager.javaClass.getDeclaredField("lspClients").let {
            it.isAccessible = true
            it.get(manager) as MutableCollection<LspServerImpl>
        }

    init {
        connector.lsp4jServer = remote
        setField("lsp4jServerConnector", connector)
        setField(
            "initializeResult",
            InitializeResult(
                ServerCapabilities().apply { setTextDocumentSync(TextDocumentSyncKind.Incremental) }
            ),
        )
        setField("state", LspServerState.Running)
        servers.add(server)
    }

    fun open(file: VirtualFile) = server.documentSyncManager.open(file)

    fun close(file: VirtualFile) = server.documentSyncManager.close(file)

    fun drain() {
        val sent = CountDownLatch(1)
        server.sendNotification { sent.countDown() }
        check(sent.await(30, TimeUnit.SECONDS)) { "SDK executor did not drain" }
    }

    fun stop() {
        setField("state", LspServerState.ShutdownNormally)
        server.requestExecutor.shutdownNow()
    }

    override fun close() {
        servers.remove(server)
        stop()
        lifecycle.session.dispose()
    }

    private fun setField(name: String, value: Any) {
        LspServerImpl::class.java.getDeclaredField(name).apply {
            isAccessible = true
            set(server, value)
        }
    }
}
