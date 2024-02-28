package dev.nx.console.project_details

import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.*
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.utils.nxBasePath
import java.nio.file.Paths
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class ProjectDetailsFileEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(project: Project, file: VirtualFile): Boolean {
        if (!NxConsoleSettingsProvider.getInstance().showProjectDetailsView) return false
        if (file.name.endsWith("project.json")) {
            return true
        }
        if (ProjectDetailsFilesService.getInstance(project).isProjectDetailsFile(file)) {
            return true
        }
        return false
    }

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        return ProjectDetailsEditorWithPreview(project, file)
    }

    override fun getEditorTypeId(): String {
        return "project-details-editor"
    }

    override fun getPolicy(): FileEditorPolicy {
        return FileEditorPolicy.HIDE_DEFAULT_EDITOR
    }
}

@Service(Service.Level.PROJECT)
class ProjectDetailsFilesService(private val project: Project, private val cs: CoroutineScope) {
    private var projectDetailsFiles: List<String> = emptyList()

    private val nxlsService = NxlsService.getInstance(project)

    init {
        projectDetailsFiles =
            PropertiesComponent.getInstance(project).getList("dev.nx.console.project_details_files")
                ?: emptyList()
        setProjectDetailsFiles()
        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                NxWorkspaceRefreshListener { setProjectDetailsFiles() }
            )
        }
    }

    fun isProjectDetailsFile(file: VirtualFile): Boolean {
        return projectDetailsFiles.contains(file.path)
    }

    private fun setProjectDetailsFiles() {
        cs.launch {
            val sourceMapFilesToProjectMap = nxlsService.sourceMapFilesToProjectMap()

            val pathsSet = mutableSetOf<String>()

            sourceMapFilesToProjectMap.keys.forEach { sourceMapFilePath ->
                pathsSet.add(Paths.get(project.nxBasePath, sourceMapFilePath).toString())

                Paths.get(sourceMapFilePath)
                    .parent
                    ?.toString()
                    ?.let { parent ->
                        Paths.get(project.nxBasePath, parent, "package.json").toString()
                    }
                    ?.also { packageJsonPath -> pathsSet.add(packageJsonPath) }
            }

            if (pathsSet.size > 0) {
                projectDetailsFiles = pathsSet.toList()
                PropertiesComponent.getInstance(project)
                    .setList("dev.nx.console.project_details_files", projectDetailsFiles)
            }
            // because ProjectDetailsFileEditorProvider triggers only when the file is opened, we
            // need to reopen all files that should have a PDV preview but don't
            ApplicationManager.getApplication().invokeLater {
                val fileEditorManager = FileEditorManager.getInstance(project)

                val openFiles = fileEditorManager.openFiles

                projectDetailsFiles.forEach { projectDetailsFile ->
                    val file = openFiles.find { it.path == projectDetailsFile }
                    if (
                        file != null &&
                            fileEditorManager.getSelectedEditor(file) !is
                                ProjectDetailsEditorWithPreview
                    ) {
                        fileEditorManager.closeFile(file)
                        fileEditorManager.openFile(file, true)
                    }
                }
            }
        }
    }

    companion object {
        fun getInstance(project: Project): ProjectDetailsFilesService =
            project.getService(ProjectDetailsFilesService::class.java)
    }
}
