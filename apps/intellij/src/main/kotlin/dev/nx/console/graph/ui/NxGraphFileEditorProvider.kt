package dev.nx.console.graph.ui

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

internal class NxGraphFileEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(project: Project, file: VirtualFile): Boolean = file is NxGraphFile

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        return NxGraphFileEditor(project, file as NxGraphFile)
    }

    override fun getEditorTypeId(): String = NxGraphFileEditorProvider.editorTypeId

    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_DEFAULT_EDITOR

    companion object {
        const val editorTypeId = "NxGraphEditor"
    }
}
