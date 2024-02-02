package dev.nx.console.project_details

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.TextEditor
import com.intellij.openapi.fileEditor.TextEditorWithPreview
import com.intellij.openapi.fileEditor.impl.text.TextEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import dev.nx.console.models.NxVersion
import dev.nx.console.utils.NxVersionUtil

class ProjectDetailsEditorWithPreview(project: Project, file: VirtualFile) :
    TextEditorWithPreview(createEditor(project, file), createPreviewComponent(project, file)),
    DumbAware {
    init {
        layout =
            NxVersionUtil.getInstance(project).nxVersion.let {
                if (it == null || !it.gte(NxVersion(major = 17, minor = 13, full = "17.13.0"))) {
                    Layout.SHOW_EDITOR
                } else {
                    Layout.SHOW_EDITOR_AND_PREVIEW
                }
            }
    }

    companion object {
        private fun createEditor(project: Project, file: VirtualFile): TextEditor {
            return (TextEditorProvider.getInstance().createEditor(project, file) as TextEditor)
        }

        private fun createPreviewComponent(project: Project, file: VirtualFile): FileEditor {
            return ProjectDetailsPreviewFileEditor(project, file)
        }
    }
}
