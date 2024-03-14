package dev.nx.console.utils

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import kotlinx.coroutines.CoroutineScope

@Service(Service.Level.PROJECT)
class ActionCoroutineHolderService(val cs: CoroutineScope) {
    companion object {
        fun getInstance(project: Project): ActionCoroutineHolderService {
            return project.getService(ActionCoroutineHolderService::class.java)
        }
    }
}
