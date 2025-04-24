package dev.nx.console.ide

import com.intellij.javascript.library.exclude.JsExcludeContributor
import com.intellij.javascript.library.exclude.JsExcludeManager
import com.intellij.javascript.nodejs.library.ScanningFileListener
import com.intellij.javascript.nodejs.library.ScanningFileListenerContributor
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

class NxWorkspaceDataFolderExcludeContributor : JsExcludeContributor() {
    override val excludeFileOrDirName: String
        get() = "workspace-data"

    override val isDirectory: Boolean
        get() = true

    override fun register(registrar: ScanningFileListenerContributor.Registrar) {
        registrar.registerFileListener(
            excludeFileOrDirName,
            isDirectory,
            object : ScanningFileListener {
                override fun fileFound(project: Project, file: VirtualFile) {
                    if (file.parent.name == ".nx") {
                        JsExcludeManager.getInstance(project).exclude(file)
                    }
                }
            },
        )
    }
}
