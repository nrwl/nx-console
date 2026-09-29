package dev.nx.console.nxls

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.openapi.vfs.newvfs.BulkFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileCreateEvent
import com.intellij.openapi.vfs.newvfs.events.VFileDeleteEvent
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import com.intellij.openapi.vfs.newvfs.events.VFileMoveEvent
import com.intellij.openapi.vfs.newvfs.events.VFilePropertyChangeEvent
import dev.nx.console.settings.NxConsoleProjectSettingsProvider
import java.nio.file.Paths

@Service(Service.Level.PROJECT)
class NxlsWorkspaceRootResolver(private val project: Project) : Disposable {
    private var cached = false
    private var configuredPath: String? = null
    private var root: VirtualFile? = null

    init {
        ApplicationManager.getApplication()
            .messageBus
            .connect(this)
            .subscribe(
                VirtualFileManager.VFS_CHANGES,
                object : BulkFileListener {
                    override fun after(events: List<VFileEvent>) {
                        if (events.any(::affectsRoot)) {
                            invalidate()
                        }
                    }
                },
            )
    }

    private fun affectsRoot(event: VFileEvent): Boolean =
        when (event) {
            is VFileCreateEvent -> event.isDirectory || event.childName in markers
            is VFileDeleteEvent,
            is VFileMoveEvent -> event.file?.let { it.isDirectory || it.name in markers } == true
            is VFilePropertyChangeEvent ->
                event.propertyName == VirtualFile.PROP_NAME &&
                    (event.file.isDirectory ||
                        event.oldValue in markers ||
                        event.newValue in markers)
            else -> false
        }

    @Synchronized
    fun resolve(): VirtualFile? {
        val configured = NxConsoleProjectSettingsProvider.getInstance(project).workspacePath
        if (cached && configured == configuredPath && root?.isValid != false) return root
        configuredPath = configured
        val basePath = project.basePath ?: return null
        val fileSystem = LocalFileSystem.getInstance()
        root =
            if (configured != null) {
                fileSystem
                    .findFileByPath(Paths.get(basePath).resolve(configured).normalize().toString())
                    ?.takeIf { it.isDirectory }
            } else {
                var directory = fileSystem.findFileByPath(basePath)
                while (directory != null && markers.none { directory!!.findChild(it) != null }) {
                    directory = directory.parent
                }
                directory
            }
        cached = true
        return root
    }

    @Synchronized
    fun invalidate() {
        cached = false
        root = null
    }

    override fun dispose() {}

    companion object {
        private val markers = setOf("nx.json", "workspace.json", "lerna.json")

        fun getInstance(project: Project): NxlsWorkspaceRootResolver =
            project.getService(NxlsWorkspaceRootResolver::class.java)
    }
}
