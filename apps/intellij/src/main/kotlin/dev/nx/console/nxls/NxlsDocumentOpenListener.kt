package dev.nx.console.nxls

import com.intellij.notebook.editor.BackedVirtualFile
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspClient
import com.intellij.platform.lsp.api.LspClientManagerListener
import com.intellij.platform.lsp.impl.LspClientImpl

internal object NxlsDocumentOpenListener : LspClientManagerListener {
    @Suppress("INVISIBLE_MEMBER", "INVISIBLE_REFERENCE")
    override fun fileOpened(lspClient: LspClient, file: VirtualFile) {
        if (lspClient !is LspClientImpl || lspClient.descriptor !is NxlsClientDescriptor) return
        // The manager can also replay existing opens outside a write action.
        if (!ApplicationManager.getApplication().isWriteAccessAllowed) return

        val origin = BackedVirtualFile.getOriginFileIfBacked(file)
        if (FileEditorManager.getInstance(lspClient.project).isFileOpen(origin)) return
        val documents = FileDocumentManager.getInstance()
        val document = documents.getCachedDocument(origin)
        if (document != null && documents.isDocumentUnsaved(document)) return

        // A queued selection can reach LSP after the last editor closes. Close it within
        // the same write action to keep the SDK and server in sync.
        // Remove once https://youtrack.jetbrains.com/issue/IJPL-262167 ships in the minimum IDE.
        lspClient.documentSyncManager.close(file)
    }
}
