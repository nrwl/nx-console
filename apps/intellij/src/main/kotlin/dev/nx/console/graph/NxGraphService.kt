package dev.nx.console.graph

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.util.messages.MessageBusConnection
import dev.nx.console.graph.ui.*
import dev.nx.console.models.NxVersion
import dev.nx.console.models.ProjectGraphOutput
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

public suspend fun getNxGraphService(project: Project): INxGraphService? {
    val nxlsService = NxlsService.getInstance(project)
    val nxVersion =
        ProjectLevelCoroutineHolderService.getInstance(project)
            .cs
            .async { nxlsService.workspace()?.nxVersion }
            .await()
            ?: return null

    return if (nxVersion.gte(NxVersion(major = 17, minor = 3, full = "17.3.0-beta.3"))) {
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
class OldNxGraphService(override val project: Project, private val cs: CoroutineScope) :
    INxGraphService {

    private val state: MutableStateFlow<NxGraphStates> = MutableStateFlow(NxGraphStates.Init)

    private lateinit var graphBrowser: OldNxGraphBrowser

    private var projectGraphOutput: ProjectGraphOutput? = null

    init {
        cs.launch {
            projectGraphOutput = NxlsService.getInstance(project).projectGraphOutput()

            with(project.messageBus.connect(cs)) {
                subscribe(
                    NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
                    NxWorkspaceRefreshListener { cs.launch { loadProjectGraph(reload = true) } }
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

        val nxVersion = cs.async { NxlsService.getInstance(project).workspace()?.nxVersion }

        graphBrowser = OldNxGraphBrowser(project, state.asStateFlow(), nxVersion)
        val virtualFile = DefaultNxGraphFile("Nx Graph", graphBrowser)

        if (state.value is NxGraphStates.Init || state.value is NxGraphStates.Error) {
            cs.launch { loadProjectGraph() }
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
        NxlsService.getInstance(project).createProjectGraph().apply {
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
class NxGraphService(override val project: Project, private val cs: CoroutineScope) :
    INxGraphService {

    private var graphBrowser: NxGraphBrowser? = null

    init {
        val busConnection: MessageBusConnection = project.messageBus.connect()
        busConnection.subscribe(
            FileEditorManagerListener.FILE_EDITOR_MANAGER,
            object : FileEditorManagerListener {
                override fun fileClosed(source: FileEditorManager, file: VirtualFile) {
                    // if we move a file to another tab, it will be closed and opened again
                    // we don't want to dispose the browser in this case, so we wait for a second
                    checkDisposalAfterDelay()
                }
            }
        )
    }

    private fun showNxGraphInEditor() {
        ApplicationManager.getApplication().invokeAndWait {
            val fileEditorManager = FileEditorManager.getInstance(project)

            val nxGraphEditor =
                fileEditorManager.allEditors.find {
                    it.file.fileType.name == NxGraphFileType.INSTANCE.name
                }

            if (nxGraphEditor != null) {
                fileEditorManager.openFile(nxGraphEditor.file, true)
                return@invokeAndWait
            }

            val graphBrowser = NxGraphBrowser(project)
            val virtualFile = DefaultNxGraphFile("Nx Graph", graphBrowser)

            this@NxGraphService.graphBrowser = graphBrowser

            fileEditorManager.openFile(virtualFile, true)
        }
    }

    override fun selectAllProjects() {
        showNxGraphInEditor()
        graphBrowser?.selectAllProjects()
    }

    override fun focusProject(projectName: String) {
        showNxGraphInEditor()
        graphBrowser?.focusProject(projectName)
    }

    override fun focusTaskGroup(taskGroupName: String) {
        showNxGraphInEditor()
        graphBrowser?.focusTargetGroup(taskGroupName)
    }

    override fun focusTask(nxProject: String, nxTarget: String) {
        showNxGraphInEditor()
        graphBrowser?.focusTarget(nxProject, nxTarget)
    }

    private fun checkDisposalAfterDelay() {
        cs.launch {
            delay(1000)
            val editors = FileEditorManager.getInstance(project).allEditors
            val hasNxGraphEditor =
                editors.any { it.file.fileType.name == NxGraphFileType.INSTANCE.name }

            if (!hasNxGraphEditor) {
                graphBrowser?.also { Disposer.dispose(it) }
            }
        }
    }

    companion object {
        fun getInstance(project: Project): NxGraphService =
            project.getService(NxGraphService::class.java)
    }
}
