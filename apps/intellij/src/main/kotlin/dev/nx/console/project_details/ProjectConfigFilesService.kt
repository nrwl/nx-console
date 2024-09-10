package dev.nx.console.project_details

import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
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
            val sourceMapFilesToProjectMap = nxlsService.sourceMapFilesToProjectMap()

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
                        !workspace?.workspace?.projects.isNullOrEmpty()
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
        // because ProjectDetailsFileEditorProvider triggers only when the file is opened, we
        // need to reopen all files that should have a PDV preview but don't
        val fileEditorManager = FileEditorManager.getInstance(project)

        val openFiles = fileEditorManager.openFiles

        projectConfigFilesPaths.forEach { projectDetailsFile ->
            val file = openFiles.find { it.path == projectDetailsFile }
            if (
                file != null &&
                    fileEditorManager.getSelectedEditor(file) !is ProjectDetailsEditorWithPreview
            ) {
                fileEditorManager.closeFile(file)
                fileEditorManager.openFile(file, true)
            }
        }
    }

    companion object {
        fun getInstance(project: Project): ProjectConfigFilesService =
            project.getService(ProjectConfigFilesService::class.java)
    }
}
