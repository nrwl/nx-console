package dev.nx.console.nxls

import kotlinx.coroutines.runBlocking
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspServerDescriptor
import com.intellij.platform.lsp.api.LspServerListener
import com.intellij.platform.lsp.api.LspServerNotificationsHandler
import com.intellij.platform.lsp.api.customization.LspCustomization
import dev.nx.console.nxls.client.NxlsLoggingNotificationsHandler
import dev.nx.console.nxls.client.NxlsLsp4jClient
import dev.nx.console.nxls.server.NxlsLanguageServer
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.utils.DocumentUtils
import dev.nx.console.utils.nxlsWorkingPath
import org.eclipse.lsp4j.InitializeResult

class NxlsServerDescriptor
internal constructor(
    project: Project,
    val root: VirtualFile,
    val generation: Long,
    private val session: NxlsSession,
) : LspServerDescriptor(project, "Nx", root) {
    private val workspacePath = root.path

    internal fun checkBeforeStart() = session.beforeStart(generation)

    override fun startServerProcess() = run {
        checkBeforeStart()
        super.startServerProcess()
    }

    // The platform calls this from a pooled thread whose context has been reset, so there is no
    // Job to attach to and a cancellable wait would throw.
    override fun createCommandLine() = runBlocking {
        NxlsCommandLineBuilder(NxlsWorkspaceSnapshot.capture(project, workspacePath)).build().also {
            checkBeforeStart()
        }
    }

    override fun createInitializationOptions(): Any =
        mapOf(
            "workspacePath" to nxlsWorkingPath(workspacePath),
            "enableDebugLogging" to NxConsoleSettingsProvider.getInstance().enableDebugLogging,
        )

    override fun isSupportedFile(file: VirtualFile) = DocumentUtils.isNxFile(file.name)

    override fun getLanguageId(file: VirtualFile) = "json"

    override val lsp4jServerClass = NxlsLanguageServer::class.java

    override fun createLsp4jClient(handler: LspServerNotificationsHandler) =
        NxlsLsp4jClient(NxlsLoggingNotificationsHandler(handler), project, session, generation)

    override val lspServerListener =
        object : LspServerListener {
            override fun serverInitialized(params: InitializeResult) {
                session.serverInitialized(generation)
            }

            override fun serverStopped(shutdownNormally: Boolean) {
                session.serverStopped(generation)
            }
        }

    override val lspCustomization: LspCustomization
        get() = LspCustomization()
}
