package dev.nx.console.run

import com.intellij.execution.ProgramRunnerUtil
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import dev.nx.console.NxIcons
import dev.nx.console.telemetry.TelemetryService

class NxRunAction(private val nxProject: String, private val nxTarget: String) : AnAction() {

    init {
        templatePresentation.text = "Run $nxProject:$nxTarget"
        templatePresentation.icon = NxIcons.Action
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project).featureUsed("Nx Run - context menu")

        val runConfig =
            NxCommandConfiguration(project, NxRunConfigurationProducer().configurationFactory)
        runConfig.nxRunSettings = NxRunSettings().copy(nxProjects = nxProject, nxTargets = nxTarget)

        val runner = getOrCreateRunnerConfigurationSettings(project, nxProject, nxTarget)

        ProgramRunnerUtil.executeConfiguration(runner, DefaultRunExecutor.getRunExecutorInstance())
    }
}
