package dev.nx.console.notifier

import com.intellij.openapi.project.Project
import com.intellij.openapi.vcs.CodeSmellDetector
import com.intellij.platform.ide.progress.runWithModalProgressBlocking
import dev.nx.console.project.findNxConfigurationFiles

@Suppress("UnstableApiUsage")
fun checkForCodeSmells(project: Project) {
    val files =
        runWithModalProgressBlocking(project, "Find configuration files") {
            findNxConfigurationFiles(project)
        }
    val codeSmellDetector = CodeSmellDetector.getInstance(project)
    val codeSmells = codeSmellDetector.findCodeSmells(files)
    if (codeSmells.size == 0) {
        Notifier.notifyAnything(
            project,
            "We couldn't find any problems in your Nx configuration files. Is the \$schema property specified?"
        )
    } else {
        codeSmellDetector.showCodeSmellErrors(codeSmells)
    }
}
