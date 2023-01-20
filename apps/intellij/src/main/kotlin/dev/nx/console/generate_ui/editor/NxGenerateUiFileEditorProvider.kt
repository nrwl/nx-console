package dev.nx.console.generate_ui.editor

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

class NxGenerateUiFileEditorProvider: FileEditorProvider, DumbAware {
  override fun accept(project: Project, file: VirtualFile): Boolean = file is NxGenerateUiFile

  override fun createEditor(project: Project, file: VirtualFile): FileEditor {
    return NxGenerateUiFileEditor(project, file as NxGenerateUiFile)
  }

  override fun getEditorTypeId(): String = "NxUIEditor"
  override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_DEFAULT_EDITOR
}
