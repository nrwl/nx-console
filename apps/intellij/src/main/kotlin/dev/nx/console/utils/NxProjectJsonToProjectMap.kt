package dev.nx.console.utils

import com.intellij.json.psi.JsonFile
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiFile
import dev.nx.console.models.NxProject
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

@Service(Service.Level.PROJECT)
class NxProjectJsonToProjectMap(val project: Project, private val cs: CoroutineScope) {
    private val pathsToProjectsMap: MutableMap<String, NxProject> = mutableMapOf()

    fun init() {
        cs.launch { populateMap() }
        with(project.messageBus.connect(cs)) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener { cs.launch { populateMap() } }
            )
        }
    }

    fun getProjectForProjectJson(projectJsonFile: PsiFile): NxProject? {
        if (projectJsonFile !is JsonFile) {
            return null
        }
        if (projectJsonFile.name != "project.json") {
            return null
        }
        return pathsToProjectsMap[projectJsonFile.virtualFile.path]
    }

    private suspend fun populateMap() {
        val paths = findNxConfigurationFiles(project, includeNxJson = false).map { it.path }
        val projectsMap = NxlsService.getInstance(project).projectsByPaths(paths.toTypedArray())

        pathsToProjectsMap.clear()
        pathsToProjectsMap.putAll(projectsMap)
    }

    companion object {
        fun getInstance(project: Project): NxProjectJsonToProjectMap =
            project.getService(NxProjectJsonToProjectMap::class.java)
    }
}
