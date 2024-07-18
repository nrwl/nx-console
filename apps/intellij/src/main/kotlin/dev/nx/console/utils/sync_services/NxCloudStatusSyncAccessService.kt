package dev.nx.console.utils.sync_services

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import dev.nx.console.models.NxCloudStatus
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

@Service(Service.Level.PROJECT)
class NxCloudStatusSyncAccessService(private val project: Project, private val cs: CoroutineScope) {
    var cloudStatus: NxCloudStatus? = null
        private set

    private var nxlsService = NxlsService.getInstance(project)

    init {
        cs.launch {
            nxlsService.awaitStarted()
            cloudStatus = nxlsService.cloudStatus()
        }

        project.messageBus
            .connect()
            .subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener {
                    if (project.isDisposed) {
                        return@NxWorkspaceRefreshListener
                    }
                    cs.launch { cloudStatus = nxlsService.cloudStatus() }
                }
            )
    }

    companion object {
        fun getInstance(project: Project): NxCloudStatusSyncAccessService {
            return project.getService(NxCloudStatusSyncAccessService::class.java)
        }
    }
}
