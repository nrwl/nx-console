package dev.nx.console.logs

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

class NxLogsFileEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(project: Project, file: VirtualFile): Boolean = file is NxLogsVirtualFile

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        return NxLogsEditor(project, file as NxLogsVirtualFile)
    }

    override fun getEditorTypeId(): String = "NxLogsEditor"

    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_DEFAULT_EDITOR
}
