package dev.nx.console.utils

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import dev.nx.console.models.NxVersion
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Service(Service.Level.PROJECT)
class NxVersionUtil(project: Project) {
    var nxVersion: NxVersion? = null

    private val nxlsService = NxlsService.getInstance(project)

    init {
        nxlsService.runAfterStarted {
            CoroutineScope(Dispatchers.Default).launch { nxVersion = nxlsService.nxVersion() }
        }

        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                object : NxWorkspaceRefreshListener {
                    override fun onNxWorkspaceRefresh() {
                        CoroutineScope(Dispatchers.Default).launch {
                            nxVersion = nxlsService.nxVersion()
                        }
                    }
                }
            )
        }
    }

    companion object {
        fun getInstance(project: Project): NxVersionUtil =
            project.getService(NxVersionUtil::class.java)
    }
}
