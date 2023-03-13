package dev.nx.console.run

import com.intellij.execution.ProgramRunnerUtil
import com.intellij.execution.RunManager
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import dev.nx.console.NxIcons

class NxRunAction(private val nxProject: String, private val nxTarget: String) : AnAction() {

    init {
        templatePresentation.text = "Run $nxProject:$nxTarget"
        templatePresentation.icon = NxIcons.Action
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val runConfig =
            NxCommandConfiguration(project, NxRunConfigurationProducer().configurationFactory)
        runConfig.nxRunSettings = NxRunSettings().copy(nxProjects = nxProject, nxTargets = nxTarget)

        ProgramRunnerUtil.executeConfiguration(
            RunManager.getInstance(project).getConfigurationSettingsList(runConfig.type).first(),
            DefaultRunExecutor.getRunExecutorInstance()
        )
    }
}
