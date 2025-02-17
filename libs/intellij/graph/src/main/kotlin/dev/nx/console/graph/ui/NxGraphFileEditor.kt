package dev.nx.console.graph.ui

import com.intellij.diff.util.FileEditorBase
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import javax.swing.JComponent

class NxGraphFileEditor(private val project: Project, private val nxGraphFile: NxGraphFile) :
    FileEditorBase() {

    private val mainComponent: JComponent = nxGraphFile.createMainComponent(project)

    override fun getComponent(): JComponent {
        return mainComponent
    }

    override fun getFile(): VirtualFile {
        return nxGraphFile
    }

    override fun getName(): String {
        return "Graph"
    }

    override fun getPreferredFocusedComponent(): JComponent? {
        return null
    }
}
