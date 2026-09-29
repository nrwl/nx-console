package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.VirtualFile

@Remote("com.intellij.platform.lsp.api.LspServerManager")
interface NxlsPlatformManagers {
    fun getInstance(project: Project): NxlsPlatformManager
}

@Remote("com.intellij.platform.lsp.impl.LspServerManagerImpl")
interface NxlsPlatformManager {
    fun `getAllRunningServers$intellij_platform_lsp_impl`(): List<NxlsPlatformServer>
}

@Remote("com.intellij.platform.lsp.impl.LspRequestExecutorImpl")
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

internal fun Driver.nxlsPlatformServer(project: Project): NxlsPlatformServer =
    utility<NxlsPlatformManagers>()
        .getInstance(project)
        .`getAllRunningServers$intellij_platform_lsp_impl`()
        .single { it.getDescriptor().getPresentableName() == "Nx" }

internal fun Driver.nxlsAssertTracked(server: NxlsPlatformServer, files: List<VirtualFile>) {
    val missing = files.filterNot { server.`isFileOpened$intellij_platform_lsp_impl`(it) }
    check(missing.isEmpty()) {
        "Generation ${server.getDescriptor().getGeneration()} has not opened ${missing.map { it.getPath() }} before tab selection"
    }
}

/** Negative controls affect only the running server, never the fixture or editor buffers. */
internal fun Driver.nxlsDocumentFault(
    server: NxlsPlatformServer,
    file: VirtualFile,
    staleText: String,
) {
    when (System.getenv("NX_AUTOMATION_FAULT")) {
        "missing-document",
        "disconnected-document" -> server.`sendDidCloseRequest$intellij_platform_lsp_impl`(file)
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
