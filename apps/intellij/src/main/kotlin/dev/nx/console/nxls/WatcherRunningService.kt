package dev.nx.console.nxls

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

@Service(Service.Level.PROJECT)
class WatcherRunningService(private val project: Project) {
    private val _status = MutableStateFlow<String?>(null)
    val status: StateFlow<String?> = _status.asStateFlow()

    fun setStatus(status: String) {
        _status.value = status
    }

    companion object {
        fun getInstance(project: Project): WatcherRunningService =
            project.getService(WatcherRunningService::class.java)
    }
}
