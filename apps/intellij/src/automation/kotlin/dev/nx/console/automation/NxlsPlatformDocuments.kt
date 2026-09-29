package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.VirtualFile

@Remote("com.intellij.platform.lsp.api.LspClientManager")
interface NxlsPlatformManagers {
    fun getInstance(project: Project): NxlsPlatformManager
}

@Remote("com.intellij.platform.lsp.impl.LspClientManagerImpl")
interface NxlsPlatformManager {
    fun `getRunningClients$intellij_platform_lsp_impl`(): List<NxlsPlatformClient>
}

@Remote("com.intellij.platform.lsp.impl.LspRequestExecutor")
interface NxlsPlatformRequests {
    fun getCompletionList(file: VirtualFile, offset: Int, explicit: Boolean): NxlsCompletionList?
}

@Remote("org.eclipse.lsp4j.CompletionList")
interface NxlsCompletionList {
    fun getItems(): List<NxlsCompletionItem>
}

@Remote("org.eclipse.lsp4j.services.LanguageServer")
interface NxlsRemoteServer {
    fun getTextDocumentService(): NxlsRemoteDocuments
}

@Remote("org.eclipse.lsp4j.services.TextDocumentService")
interface NxlsRemoteDocuments {
    fun didOpen(params: NxlsDidOpen)
}

@Remote("org.eclipse.lsp4j.DidOpenTextDocumentParams") interface NxlsDidOpen

@Remote("org.eclipse.lsp4j.TextDocumentItem") interface NxlsDocumentItem

internal fun Driver.nxlsPlatformClient(project: Project): NxlsPlatformClient =
    utility<NxlsPlatformManagers>()
        .getInstance(project)
        .`getRunningClients$intellij_platform_lsp_impl`()
        .single { it.getDescriptor().getPresentableName() == "Nx" }

internal fun Driver.nxlsAssertTracked(server: NxlsPlatformClient, files: List<VirtualFile>) {
    val missing =
        files.filterNot {
            server.`getDocumentSyncManager$intellij_platform_lsp_impl`().isFileOpened(it)
        }
    check(missing.isEmpty()) {
        "Generation ${server.getDescriptor().getGeneration()} has not opened ${missing.map { it.getPath() }} before tab selection"
    }
}

/** Negative controls affect only the running server, never the fixture or editor buffers. */
internal fun Driver.nxlsDocumentFault(
    server: NxlsPlatformClient,
    file: VirtualFile,
    staleText: String,
) {
    when (System.getenv("NX_AUTOMATION_FAULT")) {
        "missing-document",
        "disconnected-document" ->
            server.`getDocumentSyncManager$intellij_platform_lsp_impl`().close(file)
        "stale-document" -> {
            val item =
                new(
                    NxlsDocumentItem::class,
                    server.getDescriptor().getFileUri(file),
                    "json",
                    0,
                    staleText,
                )
            server
                .`getLsp4jServer$intellij_platform_lsp_impl`()
                .getTextDocumentService()
                .didOpen(new(NxlsDidOpen::class, item))
        }
    }
}
