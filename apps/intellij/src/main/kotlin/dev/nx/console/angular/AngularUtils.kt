package dev.nx.console.angular

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.findFile

fun findFileUpHierarchy(project: Project?, context: VirtualFile?, fileName: String): VirtualFile? {
  var current = context
  while (current != null) {
    if (current.isDirectory) {
      current.findFile(fileName)?.let { return it }
    }
    current = current.parent
  }
  @Suppress("DEPRECATION")
  return project?.baseDir?.findFile(fileName)
}
