package dev.nx.console.project_details

import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import dev.nx.console.models.NxProject
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.nxBasePath
import java.nio.file.InvalidPathException
import java.nio.file.Paths
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import logger

@Service(Service.Level.PROJECT)
class ProjectConfigFilesService(private val project: Project, private val cs: CoroutineScope) {
    private var projectConfigFilesPaths: List<String> = emptyList()
    private val pathsToProjectsMap: MutableMap<String, NxProject> = mutableMapOf()

    init {
        projectConfigFilesPaths =
            PropertiesComponent.getInstance(project).getList("dev.nx.console.project_details_files")
                ?: emptyList()
        setProjectConfigFilesInfo()
        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener { setProjectConfigFilesInfo() },
            )
        }
    }

    fun isProjectDetailsFile(file: VirtualFile): Boolean {
        try {
            val normalizedFilePath = Paths.get(file.path).normalize().toString()
            return projectConfigFilesPaths
                .map { Paths.get(it).normalize().toString() }
                .contains(normalizedFilePath)
        } catch (exception: InvalidPathException) {
            return false
        }
    }

    fun getProjectForFile(file: VirtualFile): NxProject? {
        val normalizedFilePath = Paths.get(file.path).normalize().toString()
        return pathsToProjectsMap[normalizedFilePath]
    }

    private fun setProjectConfigFilesInfo() {
        val nxlsService = NxlsService.getInstance(project)
        cs.launch {
            val sourceMapFilesToProjectMap = nxlsService.sourceMapFilesToProjectsMap()

            val pathsSet = mutableSetOf<String>()

            sourceMapFilesToProjectMap.keys.forEach { sourceMapFilePath ->
                val normalizedPath =
                    Paths.get(project.nxBasePath, sourceMapFilePath).normalize().toString()
                pathsSet.add(normalizedPath)

                Paths.get(sourceMapFilePath)
                    .parent
                    ?.toString()
                    ?.let { parent ->
                        Paths.get(project.nxBasePath, parent, "package.json").normalize().toString()
                    }
                    ?.also { packageJsonPath -> pathsSet.add(packageJsonPath) }
            }

            if (pathsSet.size > 0) {
                projectConfigFilesPaths = pathsSet.toList()
                PropertiesComponent.getInstance(project)
                    .setList("dev.nx.console.project_details_files", projectConfigFilesPaths)

                val projectsMap =
                    nxlsService.projectsByPaths(projectConfigFilesPaths.toTypedArray()).mapKeys {
                        Paths.get(it.key).normalize().toString()
                    }
                pathsToProjectsMap.clear()
                pathsToProjectsMap.putAll(projectsMap)
            } else {
                val workspace = nxlsService.workspace()
                if (
                    !workspace?.errors.isNullOrEmpty() &&
                        workspace?.isPartial != true &&
                        !workspace?.projectGraph?.nodes.isNullOrEmpty()
                ) {
                    pathsToProjectsMap.clear()
                }
            }

            withContext(Dispatchers.EDT) { ensurePDVPreviewFileEditors() }
        }
    }

    // TODO: CHANGE THIS TO SHOW CLICKABLE BALLOON NOTIFICATION OR SOMETHING PROMPTING USERS TO
    // REOPEN AND SEE THE PDV THEMSELVES
    private fun ensurePDVPreviewFileEditors() {
        if (project.isDisposed) return

        try {
            // because ProjectDetailsFileEditorProvider triggers only when the file is opened, we
            // need to reopen all files that should have a PDV preview but don't
            val fileEditorManager = FileEditorManager.getInstance(project)

            val openFiles = fileEditorManager.openFiles

            projectConfigFilesPaths.forEach { projectDetailsFile ->
                val file = openFiles.find { it.path == projectDetailsFile }
                if (
                    file != null &&
                        file.isValid &&
                        !project.isDisposed &&
                        fileEditorManager.getSelectedEditor(file) !is
                            ProjectDetailsEditorWithPreview
                ) {
                    try {
                        fileEditorManager.closeFile(file)
                        // Use invokeLater to avoid race conditions in tab updates
                        ApplicationManager.getApplication()
                            .invokeLater {
                                if (!project.isDisposed && file.isValid) {
                                    fileEditorManager.openFile(file, true)
                                }
                            }
                    } catch (e: Exception) {
                       logger<ProjectConfigFilesService>()
                            .warn("Failed to reopen project details file: ${file.path}", e)
                    }
                }
            }
        } catch (e: Exception) {
            // Handle any unexpected errors gracefully
            logger<ProjectConfigFilesService>()
                .warn("Error in ensurePDVPreviewFileEditors", e)
        }
    }

    companion object {
        fun getInstance(project: Project): ProjectConfigFilesService =
            project.getService(ProjectConfigFilesService::class.java)
    }
}
