package dev.nx.console.graph

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import dev.nx.console.graph.ui.DefaultNxGraphFile
import dev.nx.console.graph.ui.NxGraphBrowser
import dev.nx.console.graph.ui.NxGraphFileType
import dev.nx.console.models.ProjectGraphOutput
import dev.nx.console.services.NxWorkspaceRefreshListener
import dev.nx.console.services.NxlsService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

private val logger = logger<NxGraphService>()

class NxGraphService(val project: Project) {

    private val nxlsService = NxlsService.getInstance(project)

    private val scope = CoroutineScope(Dispatchers.Default)
    private val state: MutableStateFlow<NxGraphStates> = MutableStateFlow(NxGraphStates.Init)

    private lateinit var graphBrowser: NxGraphBrowser

    private var projectGraphOutput: ProjectGraphOutput? = null
    init {
        scope.launch {
            projectGraphOutput = nxlsService.projectGraphOutput()

            with(project.messageBus.connect()) {
                subscribe(
                    NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                    object : NxWorkspaceRefreshListener {
                        override fun onNxWorkspaceRefresh() {
                            CoroutineScope(Dispatchers.Default).launch {
                                loadProjectGraph(reload = true)
                            }
                        }
                    }
                )
            }
        }
    }

    fun showProjectGraphInEditor() {
        val fileEditorManager = FileEditorManager.getInstance(project)

        val nxGraphEditor =
            fileEditorManager.allEditors.find {
                it.file.fileType.name == NxGraphFileType.INSTANCE.name
            }

        if (nxGraphEditor != null) {
            fileEditorManager.closeFile(nxGraphEditor.file)
            // opening the file instead of reloading is instant and more performant but leads to a
            // shifted graph sometimes
            // fileEditorManager.openEditor(OpenFileDescriptor(project, nxGraphEditor.file), true)
            // return
        }

        val nxVersion =
            CoroutineScope(Dispatchers.Default).async { nxlsService.workspace()?.nxVersion }

        graphBrowser = NxGraphBrowser(project, state.asStateFlow(), nxVersion)
        val virtualFile = DefaultNxGraphFile("Project Graph", project, graphBrowser)

        if (state.value is NxGraphStates.Init || state.value is NxGraphStates.Error) {
            scope.launch { loadProjectGraph() }
        }

        fileEditorManager.openFile(virtualFile, true).apply {
            Disposer.register(first(), graphBrowser)
        }
    }

    fun selectAllProjects() {
        graphBrowser.selectAllProjects()
    }

    fun focusProject(projectName: String) {
        graphBrowser.focusProject(projectName)
    }

    fun selectAllTasks() {
        graphBrowser.selectAllTasks()
    }

    fun focusTaskGroup(taskGroupName: String) {
        graphBrowser.focusTaskGroup(taskGroupName)
    }

    fun focusTask(nxProject: String, nxTarget: String) {
        graphBrowser.focusTask(nxProject, nxTarget)
    }

    private suspend fun loadProjectGraph(reload: Boolean = false) {
        state.emit(NxGraphStates.Loading)
        nxlsService.createProjectGraph().apply {
            if (this == null) {
                state.value =
                    projectGraphOutput.let {
                        if (it == null) {
                            NxGraphStates.Error("could not load project graph location")
                        } else {
                            NxGraphStates.Loaded(it, reload)
                        }
                    }
            } else {
                state.value = NxGraphStates.Error(this.message)
            }
        }
    }

    companion object {
        fun getInstance(project: Project): NxGraphService =
            project.getService(NxGraphService::class.java)
    }
}
