package dev.nx.console.run

import com.intellij.execution.Executor
import com.intellij.execution.RunManager
import com.intellij.execution.RunnerAndConfigurationSettings
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.runners.ExecutionUtil
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project

@Service(Service.Level.PROJECT)
class NxTaskExecutionManager(val project: Project) {

    fun execute(nxProject: String, nxTarget: String) {
        execute(nxProject, nxTarget, "")
    }

    fun execute(
        nxProject: String,
        nxTarget: String,
        nxTargetConfiguration: String,
        args: List<String> = emptyList(),
        executor: Executor = DefaultRunExecutor.getRunExecutorInstance()
    ) {
        val runManager = project.service<RunManager>()

        val runnerAndConfigurationSettings: RunnerAndConfigurationSettings =
            getOrCreateRunnerConfigurationSettings(
                    project,
                    nxProject,
                    nxTarget,
                    nxTargetConfiguration,
                    args
                )
                .also { runManager.addConfiguration(it) }
        runManager.selectedConfiguration = runnerAndConfigurationSettings

        ExecutionUtil.runConfiguration(runnerAndConfigurationSettings, executor)
    }

    companion object {
        fun getInstance(project: Project): NxTaskExecutionManager =
            project.getService(NxTaskExecutionManager::class.java)
    }
}
