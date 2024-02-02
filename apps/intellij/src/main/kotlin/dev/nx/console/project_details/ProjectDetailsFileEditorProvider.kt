package dev.nx.console.project_details

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
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
import kotlin.io.path.Path
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ProjectDetailsFileEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(project: Project, file: VirtualFile): Boolean {
        if (
            file.name.endsWith("project.json") &&
                NxConsoleSettingsProvider.getInstance().showProjectDetailsView
        ) {
            return true
        }
        if (
            file.name.endsWith("package.json") &&
                NxConsoleSettingsProvider.getInstance().showProjectDetailsView
        ) {
            return if (Path(project.nxBasePath, "package.json").toString() != file.path) {
                true
            } else {
                RootPackageJsonProjectDetailsFileEditorHandler.getInstance(project)
                    .hasProjectAtRootPackageJson
            }
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
class RootPackageJsonProjectDetailsFileEditorHandler(private val project: Project) {
    var hasProjectAtRootPackageJson: Boolean = false

    private val nxlsService = NxlsService.getInstance(project)

    init {
        checkRootProject()
        with(project.messageBus.connect()) {
            subscribe(
                NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                object : NxWorkspaceRefreshListener {
                    override fun onNxWorkspaceRefresh() {
                        CoroutineScope(Dispatchers.Default).launch { checkRootProject() }
                    }
                }
            )
        }
    }

    private fun checkRootProject() {
        CoroutineScope(Dispatchers.Default).launch {
            hasProjectAtRootPackageJson =
                nxlsService.projectByPath(Path("package.json").toString()) != null
            if (hasProjectAtRootPackageJson) {
                ApplicationManager.getApplication().invokeLater {
                    val fileEditorManager = FileEditorManager.getInstance(project)

                    val openFiles = fileEditorManager.openFiles

                    val rootPackageJson =
                        openFiles.find {
                            it.path == Path(project.nxBasePath, "package.json").toString()
                        }

                    rootPackageJson?.also {
                        fileEditorManager.closeFile(it)

                        fileEditorManager.openFile(it, true)
                    }
                }
            }
        }
    }

    companion object {
        fun getInstance(project: Project): RootPackageJsonProjectDetailsFileEditorHandler =
            project.getService(RootPackageJsonProjectDetailsFileEditorHandler::class.java)
    }
}
