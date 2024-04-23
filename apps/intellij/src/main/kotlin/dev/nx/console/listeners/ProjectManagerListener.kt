package dev.nx.console.listeners

import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.ProjectManagerListener
import dev.nx.console.nxls.NxlsService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

internal class ProjectManagerListener : ProjectManagerListener {

    override fun projectClosed(project: Project) {
        ApplicationLevelCoroutineHolder.getInstance().cs.launch {
            project.service<NxlsService>().close()
        }
    }
}

@Service(Service.Level.APP)
class ApplicationLevelCoroutineHolder(val cs: CoroutineScope) {
    companion object {
        fun getInstance(): ApplicationLevelCoroutineHolder {
            return service()
        }
    }
}
