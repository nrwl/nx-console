package dev.nx.console.ide.project_json_inspection

import com.intellij.notification.Notification
import com.intellij.notification.NotificationAction
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project
import com.intellij.openapi.vcs.CodeSmellDetector
import com.intellij.platform.ide.progress.runWithModalProgressBlocking
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.findNxConfigurationFiles

class AnalyzeNxConfigurationFilesAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        checkForCodeSmells(project)
    }
}

class AnalyzeNxConfigurationFilesNotificationAction :
    NotificationAction("Analyze configuration files") {
    override fun actionPerformed(e: AnActionEvent, notification: Notification) {
        val project = e.project ?: return
        notification.expire()
        checkForCodeSmells(project)
    }
}

@Suppress("UnstableApiUsage")
fun checkForCodeSmells(project: Project) {
    val files = runWithModalProgressBlocking(project, "Find configuration files") {
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

