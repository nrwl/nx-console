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

    suspend fun openLogViewer() {
        withContext(Dispatchers.EDT) {
            val fileEditorManager = FileEditorManager.getInstance(project)
            val logFile = NxLogsVirtualFile()
            fileEditorManager.openFile(logFile, true)
        }
    }
}
