package dev.nx.console.utils

import com.intellij.json.psi.JsonFile
import com.intellij.openapi.application.ReadAction
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VfsUtilCore
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileVisitor
import com.intellij.psi.PsiFile
import dev.nx.console.models.NxProject
import dev.nx.console.services.NxWorkspaceRefreshListener
import dev.nx.console.services.NxlsService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Service(Service.Level.PROJECT)
class NxProjectJsonToProjectMap(val project: Project) {
    private val pathsToProjectsMap: MutableMap<String, NxProject> = mutableMapOf()

    fun init() {
        CoroutineScope(Dispatchers.Default).launch { populateMap() }
        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                object : NxWorkspaceRefreshListener {
                    override fun onNxWorkspaceRefresh() {
                        CoroutineScope(Dispatchers.Default).launch { populateMap() }
                    }
                }
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
        val paths = findProjectJsonFiles()
        val projectsMap = NxlsService.getInstance(project).projectsByPaths(paths.toTypedArray())

        pathsToProjectsMap.clear()
        pathsToProjectsMap.putAll(projectsMap)
    }

    private fun findProjectJsonFiles(): List<String> {
        val paths: MutableList<String> = ArrayList()
        ReadAction.run<RuntimeException> {
            val startDirectory = LocalFileSystem.getInstance().findFileByPath(project.nxBasePath)
            if (startDirectory != null) {
                VfsUtilCore.visitChildrenRecursively(
                    startDirectory,
                    object : VirtualFileVisitor<Any?>() {
                        override fun visitFile(file: VirtualFile): Boolean {
                            if (!file.isDirectory && file.name == "project.json") {
                                paths.add(file.path)
                            }
                            return true
                        }
                    }
                )
            }
        }
        return paths
    }

    companion object {
        fun getInstance(project: Project): NxProjectJsonToProjectMap =
            project.getService(NxProjectJsonToProjectMap::class.java)
    }
}
