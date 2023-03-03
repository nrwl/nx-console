package dev.nx.console.graph.ui

import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.Project
import com.intellij.testFramework.LightVirtualFile
import dev.nx.console.NxIcons
import javax.swing.Icon
import javax.swing.JComponent

class NxGraphFileType : FileType {
    override fun getName(): String = "NxGraph"

    override fun getDescription(): String = ""

    override fun getDefaultExtension(): String = ".nx"

    override fun getIcon(): Icon = NxIcons.FileType

    override fun isBinary(): Boolean = true

    companion object {
        val INSTANCE = NxGraphFileType()
    }
}

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

class DefaultNxGraphFile(name: String, project: Project, private val graphBrowser: NxGraphBrowser) :
    NxGraphFile(name) {

    override fun createMainComponent(project: Project): JComponent {
        return graphBrowser.component
    }
}
