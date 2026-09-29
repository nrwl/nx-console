package dev.nx.console.nxls

import com.intellij.openapi.progress.runBlockingCancellable
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

    override fun createCommandLine() = runBlockingCancellable {
        NxlsCommandLineBuilder(NxlsWorkspaceSnapshot.capture(project, workspacePath)).build()
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
