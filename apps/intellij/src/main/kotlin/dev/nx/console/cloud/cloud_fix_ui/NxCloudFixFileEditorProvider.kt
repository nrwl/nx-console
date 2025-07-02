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
        // Create TextEditorWithPreview for split view
        return NxCloudFixEditorWithPreview(project, file)
    }

    override fun getEditorTypeId(): String = "NxCloudFixEditor"

    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_DEFAULT_EDITOR
}
