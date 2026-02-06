package dev.nx.console.logs

import com.intellij.testFramework.LightVirtualFile
import dev.nx.console.utils.NxConsoleLogger

class NxLogsVirtualFile : LightVirtualFile("Nx Console Logs", NxLogsFileType.INSTANCE, "") {

    init {
        isWritable = false
    }

    fun refreshContent(): String {
        val content = NxConsoleLogger.getInstance().readLogContent()
        return content.ifEmpty { "No logs yet." }
    }

    override fun hashCode(): Int = name.hashCode()

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is NxLogsVirtualFile) return false
        return name == other.name
    }
}
