package dev.nx.console.logs

import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Service(Service.Level.PROJECT)
class NxLogsViewerService(private val project: Project) {

    companion object {
        fun getInstance(project: Project): NxLogsViewerService =
            project.getService(NxLogsViewerService::class.java)
    }

    private var currentLogFile: NxLogsVirtualFile? = null

    suspend fun openLogViewer() {
        withContext(Dispatchers.EDT) {
            val fileEditorManager = FileEditorManager.getInstance(project)

            // Reuse existing file if already open
            val existingFile = currentLogFile
            if (existingFile != null) {
                fileEditorManager.openFile(existingFile, true)
                return@withContext
            }

            // Create new log file and open it
            val logFile = NxLogsVirtualFile()
            fileEditorManager.openFile(logFile, true)
            currentLogFile = logFile
        }
    }

    fun onLogFileClosed() {
        currentLogFile = null
    }
}
