package dev.nx.console.project_details

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import dev.nx.console.settings.NxConsoleSettingsProvider

class ProjectDetailsFileEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(project: Project, file: VirtualFile): Boolean {
        if (!NxConsoleSettingsProvider.getInstance().showProjectDetailsView) return false
        if (file.name.endsWith("project.json")) {
            return true
        }
        if (ProjectConfigFilesService.getInstance(project).isProjectDetailsFile(file)) {
            return true
        }
        return false
    }

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        return ProjectDetailsEditorWithPreview(project, file)
    }

    override fun getEditorTypeId(): String {
        return "project-details-editor"
    }

    override fun getPolicy(): FileEditorPolicy {
        return FileEditorPolicy.HIDE_DEFAULT_EDITOR
    }
}
