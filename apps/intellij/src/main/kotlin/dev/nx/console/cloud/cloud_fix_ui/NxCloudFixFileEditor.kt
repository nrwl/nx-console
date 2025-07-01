package dev.nx.console.cloud.cloud_fix_ui

import com.intellij.diff.util.FileEditorBase
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.getPreferredFocusedComponent
import com.intellij.openapi.vfs.VirtualFile
import javax.swing.JComponent

class NxCloudFixFileEditor(
    private val project: Project,
    private val nxCloudFixFile: NxCloudFixFile
) : FileEditorBase() {

    private val mainComponent: JComponent = nxCloudFixFile.createMainComponent(project)

    override fun dispose() {
        super.dispose()
    }

    override fun getComponent(): JComponent {
        return mainComponent
    }

    override fun getFile(): VirtualFile {
        return nxCloudFixFile
    }

    override fun getName(): String {
        return "AI Fix"
    }

    override fun getPreferredFocusedComponent(): JComponent? {
        return mainComponent.getPreferredFocusedComponent()
    }
}