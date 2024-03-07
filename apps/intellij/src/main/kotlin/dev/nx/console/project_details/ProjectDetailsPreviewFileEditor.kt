package dev.nx.console.project_details

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VirtualFile
import java.beans.PropertyChangeListener
import javax.swing.JComponent

class ProjectDetailsPreviewFileEditor(project: Project, file: VirtualFile) :
    UserDataHolderBase(), FileEditor {
    private val browser = ProjectDetailsBrowser(project, file)

    override fun dispose() {
        browser.dispose()
    }

    override fun getComponent(): JComponent = browser.component

    override fun getPreferredFocusedComponent(): JComponent = browser.component

    override fun getName(): String = "Preview"

    override fun setState(state: FileEditorState) {}

    override fun addPropertyChangeListener(listener: PropertyChangeListener) {
        // Add a listener if needed
    }

    override fun removePropertyChangeListener(listener: PropertyChangeListener) {
        // Remove a listener if needed
    }

    override fun isModified(): Boolean = false

    override fun isValid(): Boolean = true
}
