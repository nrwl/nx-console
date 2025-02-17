package dev.nx.console.models

import com.intellij.openapi.fileTypes.FileType
import dev.nx.console.icons.NxIcons
import javax.swing.Icon

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
