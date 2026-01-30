package dev.nx.console.logs

import com.intellij.openapi.fileTypes.FileType
import dev.nx.console.NxIcons
import javax.swing.Icon

class NxLogsFileType : FileType {
    override fun getName(): String = "NxLogs"

    override fun getDescription(): String = "Nx Console Logs"

    override fun getDefaultExtension(): String = ".nxlog"

    override fun getIcon(): Icon = NxIcons.FileType

    override fun isBinary(): Boolean = false

    override fun isReadOnly(): Boolean = true

    companion object {
        val INSTANCE = NxLogsFileType()
    }
}
