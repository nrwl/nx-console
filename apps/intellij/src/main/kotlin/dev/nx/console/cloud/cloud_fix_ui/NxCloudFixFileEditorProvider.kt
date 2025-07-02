package dev.nx.console.cloud.cloud_fix_ui

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

internal class NxCloudFixFileEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(project: Project, file: VirtualFile): Boolean = file is NxCloudFixFile

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        // For now, assume all NxCloudFixFiles are the concrete implementation
        // In commit 7, we'll update this for the split view
        return NxCloudFixFileEditor(project, file as NxCloudFixFile)
    }

    override fun getEditorTypeId(): String = "NxCloudFixEditor"

    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_DEFAULT_EDITOR
}
