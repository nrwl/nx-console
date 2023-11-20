package dev.nx.console.project_details

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.TextEditor
import com.intellij.openapi.fileEditor.TextEditorWithPreview
import com.intellij.openapi.fileEditor.impl.text.TextEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

class ProjectDetailsEditorWithPreview(project: Project, file: VirtualFile) :
    TextEditorWithPreview(createEditor(project, file), createPreviewComponent(project, file)),
    DumbAware {
    companion object {
        private fun createEditor(project: Project, file: VirtualFile): TextEditor {
            return (TextEditorProvider.getInstance().createEditor(project, file) as TextEditor)
        }

        private fun createPreviewComponent(project: Project, file: VirtualFile): FileEditor {
            return ProjectDetailsPreviewFileEditor(project, file)
        }
    }
}
