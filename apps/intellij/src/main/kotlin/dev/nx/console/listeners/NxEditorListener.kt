package dev.nx.console.listeners

import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.editor.Document
import com.intellij.openapi.editor.event.EditorFactoryEvent
import com.intellij.openapi.editor.event.EditorFactoryListener
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.vfs.VirtualFile
import dev.nx.console.services.NxlsService

private val log = logger<NxEditorListener>()

private val nxFiles = setOf("nx.json", "workspace.json", "project.json")

class NxEditorListener : EditorFactoryListener {

    override fun editorReleased(event: EditorFactoryEvent) {
        val project = event.editor.project ?: return super.editorCreated(event)
        project.service<NxlsService>().removeDocument(event.editor)

        super.editorReleased(event)
    }

    override fun editorCreated(event: EditorFactoryEvent) {

        val file = virtualFile(event.editor.document) ?: return super.editorCreated(event)
        val project = event.editor.project ?: return super.editorCreated(event)

        if (file.name in nxFiles) {
            log.info("Connecting ${file.path} to lsp")
            project.service<NxlsService>().addDocument(event.editor)
        }

        super.editorCreated(event)
    }

    private fun virtualFile(document: Document): VirtualFile? {
        return FileDocumentManager.getInstance().getFile(document)
    }
}
