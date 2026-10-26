package dev.nx.console.nxls

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile
import dev.nx.console.settings.NxConsoleProjectSettingsProvider
import java.nio.file.Paths

/**
 * Resolves the directory nxls is started against.
 *
 * Startup and descriptor construction have to agree on this: the platform fixes a descriptor's
 * roots when it is built and identifies servers by them, so two answers would mean two servers.
 */
@Service(Service.Level.PROJECT)
class NxlsWorkspaceRootResolver(private val project: Project) {

    fun resolve(): VirtualFile? {
        val basePath = project.basePath ?: return null
        val fileSystem = LocalFileSystem.getInstance()
        val configured = NxConsoleProjectSettingsProvider.getInstance(project).workspacePath
        if (configured != null) {
            return fileSystem
                .findFileByPath(Paths.get(basePath).resolve(configured).normalize().toString())
                ?.takeIf { it.isDirectory }
        }
        var directory = fileSystem.findFileByPath(basePath)
        while (directory != null && markers.none { directory!!.findChild(it) != null }) {
            directory = directory.parent
        }
        return directory
    }

    companion object {
        private val markers = setOf("nx.json", "workspace.json", "lerna.json")

        fun getInstance(project: Project): NxlsWorkspaceRootResolver =
            project.getService(NxlsWorkspaceRootResolver::class.java)
    }
}
