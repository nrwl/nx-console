package dev.nx.console.run.actions

import com.intellij.ide.actions.runAnything.RunAnythingManager
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service

class NxRunAnythingAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        project.service<RunAnythingManager>().show("nx run", false, e)
    }
}
