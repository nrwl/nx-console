package dev.nx.console.utils

import com.intellij.openapi.application.readAction
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.roots.ProjectFileIndex
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile

suspend fun findNxConfigurationFiles(
    project: Project,
    includeNxJson: Boolean = true
): List<VirtualFile> {
    val paths: MutableList<VirtualFile> = ArrayList()
    readAction {
        val startDirectory = LocalFileSystem.getInstance().findFileByPath(project.nxBasePath)
        if (startDirectory != null) {
            ProjectFileIndex.getInstance(project).iterateContentUnderDirectory(startDirectory) { file ->
                if (
                    !file.isDirectory &&
                    (file.name == "project.json" ||
                        (includeNxJson && file.name == "nx.json"))
                ) {
                    paths.add(file)
                }
                ProgressManager.checkCanceled()
                return@iterateContentUnderDirectory true
            }
        }
    }
    return paths
}
