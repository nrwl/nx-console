package dev.nx.console.generate.actions

import com.intellij.ide.actions.runAnything.RunAnythingManager
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryService

class NxGenerateRunAnythingAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        TelemetryService.getInstance(project).featureUsed(TelemetryEvent.GENERATE_QUICKPICK)
        RunAnythingManager.getInstance(project).show("nx generate", false, e)
    }
}
