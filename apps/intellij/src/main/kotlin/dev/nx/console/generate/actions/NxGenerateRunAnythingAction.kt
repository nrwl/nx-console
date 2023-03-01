package dev.nx.console.generate.actions

import com.intellij.ide.actions.runAnything.RunAnythingManager
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent

class NxGenerateRunAnythingAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        RunAnythingManager.getInstance(project).show("nx generate", false, e)
    }
}
