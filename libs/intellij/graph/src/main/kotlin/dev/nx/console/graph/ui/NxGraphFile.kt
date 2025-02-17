package dev.nx.console.graph.ui

import com.intellij.openapi.project.Project
import com.intellij.testFramework.LightVirtualFile
import dev.nx.console.graph.NxGraphBrowserBase
import dev.nx.console.models.NxGraphFileType
import javax.swing.JComponent

abstract class NxGraphFile(name: String) : LightVirtualFile(name, NxGraphFileType.INSTANCE, "") {
    init {
        isWritable = false
    }

    abstract fun createMainComponent(project: Project): JComponent

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as NxGraphFile

        if (name != other.name) return false

        return true
    }

    override fun hashCode(): Int = name.hashCode()
}

class DefaultNxGraphFile(name: String, private val graphBrowser: NxGraphBrowserBase) :
    NxGraphFile(name) {
    override fun createMainComponent(project: Project): JComponent {
        return graphBrowser.component
    }
}
