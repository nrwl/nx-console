package dev.nx.console.graph

import com.intellij.openapi.components.Service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import dev.nx.console.graph.ui.*
import dev.nx.console.models.NxVersion
import dev.nx.console.models.ProjectGraphOutput
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

public suspend fun getNxGraphService(project: Project): INxGraphService? {
    val nxlsService = NxlsService.getInstance(project)
    val nxVersion =
        CoroutineScope(Dispatchers.Default).async { nxlsService.workspace()?.nxVersion }.await()
            ?: return null

    // TODO: replace with actual version
    return if (nxVersion.gte(NxVersion(major = 18, minor = 0, full = "18.0.0"))) {
        NxGraphService.getInstance(project)
    } else {
        OldNxGraphService.getInstance(project)
    }
}

interface INxGraphService {
    val project: Project

    fun selectAllProjects()

    fun focusProject(projectName: String)

    fun focusTaskGroup(taskGroupName: String)

    fun focusTask(nxProject: String, nxTarget: String)
}

@Service(Service.Level.PROJECT)
class OldNxGraphService(override val project: Project) : INxGraphService {

    private val nxlsService = NxlsService.getInstance(project)

    private val scope = CoroutineScope(Dispatchers.Default)
    private val state: MutableStateFlow<NxGraphStates> = MutableStateFlow(NxGraphStates.Init)

    private lateinit var graphBrowser: OldNxGraphBrowser

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

    private fun showNxGraphInEditor() {
        val fileEditorManager = FileEditorManager.getInstance(project)

        val nxGraphEditor =
            fileEditorManager.allEditors.find {
                it.file.fileType.name == NxGraphFileType.INSTANCE.name
            }

        if (nxGraphEditor != null) {
            fileEditorManager.openFile(nxGraphEditor.file, true)
            return
        }

        val nxVersion = scope.async { nxlsService.workspace()?.nxVersion }

        graphBrowser = OldNxGraphBrowser(project, state.asStateFlow(), nxVersion)
        val virtualFile = DefaultNxGraphFile("Nx Graph", graphBrowser)

        if (state.value is NxGraphStates.Init || state.value is NxGraphStates.Error) {
            scope.launch { loadProjectGraph() }
        }

        fileEditorManager.openFile(virtualFile, true).apply {
            Disposer.register(first(), graphBrowser)
        }
    }

    override fun selectAllProjects() {
        this.showNxGraphInEditor()
        graphBrowser.selectAllProjects()
    }

    override fun focusProject(projectName: String) {
        this.showNxGraphInEditor()
        graphBrowser.focusProject(projectName)
    }

    override fun focusTaskGroup(taskGroupName: String) {
        this.showNxGraphInEditor()
        graphBrowser.focusTaskGroup(taskGroupName)
    }

    override fun focusTask(nxProject: String, nxTarget: String) {
        this.showNxGraphInEditor()
        graphBrowser.focusTask(nxProject, nxTarget)
    }

    private suspend fun loadProjectGraph(reload: Boolean = false) {
        state.emit(NxGraphStates.Loading)
        nxlsService.createProjectGraph().apply {
            if (this == null) {
                state.emit(
                    projectGraphOutput.let {
                        if (it == null) {
                            NxGraphStates.Error("could not load project graph location")
                        } else {
                            NxGraphStates.Loaded(it, reload)
                        }
                    }
                )
            } else {
                state.emit(NxGraphStates.Error(this.message))
            }
        }
    }

    companion object {
        fun getInstance(project: Project): OldNxGraphService =
            project.getService(OldNxGraphService::class.java)
    }
}

@Service(Service.Level.PROJECT)
class NxGraphService(override val project: Project) : INxGraphService {

    private lateinit var graphBrowser: NxGraphBrowser

    private fun showNxGraphInEditor() {
        val fileEditorManager = FileEditorManager.getInstance(project)

        val nxGraphEditor =
            fileEditorManager.allEditors.find {
                it.file.fileType.name == NxGraphFileType.INSTANCE.name
            }

        if (nxGraphEditor != null) {
            fileEditorManager.openFile(nxGraphEditor.file, true)
            return
        }

        graphBrowser = NxGraphBrowser(project)
        val virtualFile = DefaultNxGraphFile("Nx Graph", graphBrowser)

        fileEditorManager.openFile(virtualFile, true).apply {
            Disposer.register(first(), graphBrowser)
        }
    }

    override fun selectAllProjects() {
        showNxGraphInEditor()
        graphBrowser.selectAllProjects()
    }

    override fun focusProject(projectName: String) {
        showNxGraphInEditor()
        graphBrowser.focusProject(projectName)
    }

    override fun focusTaskGroup(taskGroupName: String) {
        showNxGraphInEditor()
        graphBrowser.focusTargetGroup(taskGroupName)
    }

    override fun focusTask(nxProject: String, nxTarget: String) {
        showNxGraphInEditor()
        graphBrowser.focusTarget(nxProject, nxTarget)
    }

    companion object {
        fun getInstance(project: Project): NxGraphService =
            project.getService(NxGraphService::class.java)
    }
}
