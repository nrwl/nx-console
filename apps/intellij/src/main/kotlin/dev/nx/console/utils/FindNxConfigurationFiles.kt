package dev.nx.console.utils

import com.intellij.openapi.application.readAction
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VfsUtilCore
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileVisitor

suspend fun findNxConfigurationFiles(
    project: Project,
    includeNxJson: Boolean = true
): List<VirtualFile> {
    val paths: MutableList<VirtualFile> = ArrayList()
    readAction {
        val startDirectory = LocalFileSystem.getInstance().findFileByPath(project.nxBasePath)
        if (startDirectory != null) {
            VfsUtilCore.visitChildrenRecursively(
                startDirectory,
                object : VirtualFileVisitor<Any?>() {
                    override fun visitFile(file: VirtualFile): Boolean {
                        if (
                            !file.isDirectory &&
                                (file.name == "project.json" ||
                                    (includeNxJson && file.name == "nx.json"))
                        ) {
                            paths.add(file)
                        }
                        ProgressManager.checkCanceled()
                        return true
                    }
                }
            )
        }
    }
    return paths
}