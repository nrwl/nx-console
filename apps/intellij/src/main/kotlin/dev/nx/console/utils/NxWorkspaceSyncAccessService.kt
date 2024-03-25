package dev.nx.console.utils

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import dev.nx.console.models.NxWorkspace
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

@Service(Service.Level.PROJECT)
class NxWorkspaceSyncAccessService(private val project: Project, private val cs: CoroutineScope) {
    var nxWorkspaceSync: NxWorkspace? = null
        private set

    init {
        cs.launch { nxWorkspaceSync = project.nxWorkspace() }
        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener {
                    if (project.isDisposed) {
                        return@NxWorkspaceRefreshListener
                    }
                    nxWorkspaceSync = null
                    cs.launch { nxWorkspaceSync = project.nxWorkspace() }
                }
            )
        }
    }

    companion object {
        fun getInstance(project: Project): NxWorkspaceSyncAccessService {
            return project.getService(NxWorkspaceSyncAccessService::class.java)
        }
    }
}
