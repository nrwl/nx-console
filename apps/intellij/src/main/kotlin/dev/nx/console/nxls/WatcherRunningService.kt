package dev.nx.console.nxls

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

@Service(Service.Level.PROJECT)
class WatcherRunningService(private val project: Project) {
    private val _isOperational = MutableStateFlow<Boolean?>(null)
    val isOperational: StateFlow<Boolean?> = _isOperational.asStateFlow()

    fun setOperational(operational: Boolean) {
        _isOperational.value = operational
    }

    companion object {
        fun getInstance(project: Project): WatcherRunningService =
            project.getService(WatcherRunningService::class.java)
    }
}
