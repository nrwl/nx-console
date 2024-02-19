package dev.nx.console.angular

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.*
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.RootsChangeRescanningInfo
import com.intellij.openapi.roots.ex.ProjectRootManagerEx
import com.intellij.openapi.util.EmptyRunnable
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileManager
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.nxls.NxlsService.Companion.NX_WORKSPACE_REFRESH_TOPIC
import dev.nx.console.utils.writeAction
import java.nio.file.Path
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.angular2.cli.config.AngularConfig
import org.angular2.cli.config.AngularConfigProvider

@Service(Service.Level.PROJECT)
@State(name = "NxAngularConfigService", storages = [Storage("nx-angular-config.xml")])
class NxAngularConfigService(private val project: Project, private val cs: CoroutineScope) :
    PersistentStateComponent<NxAngularConfigService.AngularConfigState>, Disposable {

    init {
        project.messageBus
            .connect(this)
            .subscribe(NX_WORKSPACE_REFRESH_TOPIC, NxWorkspaceRefreshListener { refresh() })
    }

    var config: NxAngularConfig? = null

    override fun getState(): AngularConfigState? =
        config?.let { config ->
            AngularConfigState(config.file.url, config.projectFiles.mapValues { it.value.url })
        }

    override fun loadState(state: AngularConfigState) {
        val vfManager = VirtualFileManager.getInstance()
        val workspaceFile = vfManager.findFileByUrl(state.workspaceLocation)
        val projectFiles =
            state.projects
                .mapNotNull { (name, url) -> vfManager.findFileByUrl(url)?.let { Pair(name, it) } }
                .toMap()
        config = if (workspaceFile != null) NxAngularConfig(workspaceFile, projectFiles) else null
        refresh()
    }

    private fun refresh() {
        cs.launch { refreshState() }
    }

    private suspend fun refreshState() {
        val workspace = NxlsService.getInstance(project).workspace()
        if (workspace == null) {
            updateConfig(null)
            return
        }
        val manager = VirtualFileManager.getInstance()
        val workspaceRoot = manager.findFileByNioPath(Path.of(workspace.workspacePath))
        val workspaceConfig = workspaceRoot?.findFileByRelativePath("nx.json")
        if (workspaceRoot == null || workspaceConfig == null) {
            updateConfig(null)
            return
        }
        val projectFiles =
            workspace.workspace.projects.values
                .asSequence()
                // TODO use dependency graph here, or framework property
                .filter { project ->
                    project.targets.values.any { it.executor.contains("angular") }
                }
                .mapNotNull { project ->
                    workspaceRoot
                        .findFileByRelativePath(project.root)
                        ?.findFileByRelativePath("project.json")
                        ?.let { Pair(project.name, it) }
                }
                .toMap()
        updateConfig(NxAngularConfig(workspaceConfig, projectFiles))
    }

    private suspend fun updateConfig(newConfig: NxAngularConfig?) {
        if (config != newConfig) {
            config = newConfig
            withContext(Dispatchers.EDT) {
                writeAction {
                    ProjectRootManagerEx.getInstanceEx(project)
                        .makeRootsChange(
                            EmptyRunnable.getInstance(),
                            RootsChangeRescanningInfo.RESCAN_DEPENDENCIES_IF_NEEDED
                        )
                }
            }
        }
    }

    data class AngularConfigState(val workspaceLocation: String, val projects: Map<String, String>)

    override fun dispose() {}
}

class NxAngularConfigProvider : AngularConfigProvider {

    override fun findAngularConfig(project: Project, context: VirtualFile): AngularConfig? =
        project.service<NxAngularConfigService>().config
}
