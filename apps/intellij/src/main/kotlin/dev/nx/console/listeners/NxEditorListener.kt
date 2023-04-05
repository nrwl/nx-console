package dev.nx.console.listeners

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.editor.Document
import com.intellij.openapi.editor.event.EditorFactoryEvent
import com.intellij.openapi.editor.event.EditorFactoryListener
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.vfs.VirtualFile
import dev.nx.console.services.NxlsService
import dev.nx.console.utils.DocumentUtils

private val log = logger<NxEditorListener>()

class NxEditorListener : EditorFactoryListener {

    override fun editorReleased(event: EditorFactoryEvent) {
        val project = event.editor.project ?: return super.editorReleased(event)
        val service = NxlsService.getInstance(project)
        if (service.isEditorConnected(event.editor)) {
            service.removeDocument(event.editor)
        }

        super.editorReleased(event)
    }

    override fun editorCreated(event: EditorFactoryEvent) {

        val file = virtualFile(event.editor.document) ?: return super.editorCreated(event)
        val project = event.editor.project ?: return super.editorCreated(event)

        if (DocumentUtils.isNxFile(file.name)) {
            log.info("Connecting ${file.path} to lsp")
            val service = NxlsService.getInstance(project)
            if (!service.isEditorConnected(event.editor)) {
                service.addDocument(event.editor)
            }
        }

        super.editorCreated(event)
    }

    private fun virtualFile(document: Document): VirtualFile? {
        return FileDocumentManager.getInstance().getFile(document)
    }
}
