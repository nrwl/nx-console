package dev.nx.console.run

import com.intellij.execution.RunManager
import com.intellij.execution.RunnerAndConfigurationSettings
import com.intellij.openapi.project.Project

fun getOrCreateRunnerConfigurationSettings(
    project: Project,
    nxProject: String,
    nxTarget: String,
    args: List<String> = listOf()
): RunnerAndConfigurationSettings {
    val runManager = RunManager.getInstance(project)

    return runManager
        .getConfigurationSettingsList(NxCommandConfigurationType.getInstance())
        .firstOrNull {
            val nxCommandConfiguration = it.configuration as NxCommandConfiguration
            val nxRunSettings = nxCommandConfiguration.nxRunSettings
            nxRunSettings.nxTargets == nxTarget && nxRunSettings.nxProjects == nxProject
        }
        ?: runManager
            .createConfiguration("$nxProject:$nxTarget", NxCommandConfigurationType::class.java)
            .apply {
                (configuration as NxCommandConfiguration).apply {
                    nxRunSettings =
                        NxRunSettings(
                            nxProjects = nxProject,
                            nxTargets = nxTarget,
                            arguments = args.drop(1).joinToString(" "),
                        )
                }
            }
}
