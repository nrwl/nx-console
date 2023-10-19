package dev.nx.console.generate.ui.file

import com.intellij.diff.util.FileEditorBase
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.getPreferredFocusedComponent
import com.intellij.openapi.vfs.VirtualFile
import javax.swing.JComponent

class NxGenerateUiFileEditor(
    private val project: Project,
    private val nxGenerateUiFile: NxGenerateUiFile
) : FileEditorBase() {

    private val mainComponent: JComponent = nxGenerateUiFile.createMainComponent(project)

    override fun getComponent(): JComponent {
        return mainComponent
    }

    override fun getFile(): VirtualFile {
        return nxGenerateUiFile
    }

    override fun getName(): String {
        return "Generate"
    }

    override fun getPreferredFocusedComponent(): JComponent? {
        return mainComponent.getPreferredFocusedComponent()
    }
}
