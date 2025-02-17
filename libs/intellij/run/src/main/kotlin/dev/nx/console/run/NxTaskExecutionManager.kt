package dev.nx.console.run

import com.intellij.execution.Executor
import com.intellij.execution.RunManager
import com.intellij.execution.RunnerAndConfigurationSettings
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.runners.ExecutionUtil
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import dev.nx.console.models.TargetInfo
import dev.nx.console.nxls.NxlsService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

@Service(Service.Level.PROJECT)
class NxTaskExecutionManager(val project: Project, val cs: CoroutineScope) {

    fun execute(targetString: String) {
        cs.launch {
            // we try letting the nx language server split the target
            // but if that doesn't work try it ourselves
            val target =
                NxlsService.getInstance(project).parseTargetString(targetString)
                    ?: targetString.split(":").let { TargetInfo(it[0], it[1], it.getOrNull(2)) }

            execute(target.project, target.target, target.configuration ?: "")
        }
    }

    fun execute(nxProject: String, nxTarget: String) {
        execute(nxProject, nxTarget, "")
    }

    fun execute(
        nxProject: String,
        nxTarget: String,
        nxTargetConfiguration: String,
        args: List<String> = emptyList(),
        executor: Executor = DefaultRunExecutor.getRunExecutorInstance(),
    ) {
        val runManager = project.service<RunManager>()

        val runnerAndConfigurationSettings: RunnerAndConfigurationSettings =
            getOrCreateRunnerConfigurationSettings(
                    project,
                    nxProject,
                    nxTarget,
                    nxTargetConfiguration,
                    args,
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
