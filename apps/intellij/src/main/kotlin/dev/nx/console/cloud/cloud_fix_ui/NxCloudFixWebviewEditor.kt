package dev.nx.console.cloud.cloud_fix_ui

import com.intellij.diff.util.FileEditorBase
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import javax.swing.JComponent

class NxCloudFixWebviewEditor(
    private val project: Project,
    private val nxCloudFixFile: NxCloudFixFile
) : FileEditorBase() {

    private val mainComponent: JComponent = nxCloudFixFile.createMainComponent(project)

    override fun getComponent(): JComponent = mainComponent

    override fun getFile(): VirtualFile = nxCloudFixFile

    override fun getName(): String = "AI Fix"

    override fun getPreferredFocusedComponent(): JComponent? = mainComponent
}
