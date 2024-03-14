package dev.nx.console.utils

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import kotlinx.coroutines.CoroutineScope

@Service(Service.Level.PROJECT)
class ProjectLevelCoroutineHolderService(val cs: CoroutineScope) {
    companion object {
        fun getInstance(project: Project): ProjectLevelCoroutineHolderService {
            return project.getService(ProjectLevelCoroutineHolderService::class.java)
        }
    }
}
