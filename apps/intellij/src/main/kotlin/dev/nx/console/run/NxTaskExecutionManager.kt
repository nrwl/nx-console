package dev.nx.console.run

import com.intellij.execution.Executor
import com.intellij.execution.RunManager
import com.intellij.execution.RunnerAndConfigurationSettings
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.runners.ExecutionUtil
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project

class NxTaskExecutionManager(val project: Project) {
    fun execute(nxProject: String, nxTarget: String) {
        val runManager = project.service<RunManager>()

        val runnerAndConfigurationSettings: RunnerAndConfigurationSettings =
            runManager
                .getConfigurationSettingsList(NxCommandConfigurationType.getInstance())
                .firstOrNull {
                    val nxCommandConfiguration = it.configuration as NxCommandConfiguration
                    val nxRunSettings = nxCommandConfiguration.nxRunSettings
                    nxRunSettings.nxTargets == nxTarget && nxRunSettings.nxProjects == nxProject
                }
                ?: runManager
                    .createConfiguration(
                        "$nxProject[$nxTarget]",
                        NxCommandConfigurationType::class.java
                    )
                    .apply {
                        (configuration as NxCommandConfiguration).apply {
                            nxRunSettings =
                                NxRunSettings(
                                    nxProjects = nxProject,
                                    nxTargets = nxTarget,
                                )
                        }
                    }
                    .also { runManager.addConfiguration(it) }
        runManager.selectedConfiguration = runnerAndConfigurationSettings
        val executor: Executor = DefaultRunExecutor.getRunExecutorInstance()
        ExecutionUtil.runConfiguration(runnerAndConfigurationSettings, executor)
    }
}
