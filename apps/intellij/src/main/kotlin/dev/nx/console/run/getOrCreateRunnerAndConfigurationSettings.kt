package dev.nx.console.run

import com.intellij.execution.RunManager
import com.intellij.execution.RunnerAndConfigurationSettings
import com.intellij.openapi.project.Project

fun getOrCreateRunnerConfigurationSettings(
    project: Project,
    nxProject: String,
    nxTarget: String,
    nxTargetConfiguration: String = "",
    args: List<String> = emptyList()
): RunnerAndConfigurationSettings {
    val runManager = RunManager.getInstance(project)

    return runManager
        .getConfigurationSettingsList(NxCommandConfigurationType.Util.getInstance())
        .firstOrNull {
            val nxCommandConfiguration = it.configuration as NxCommandConfiguration
            val nxRunSettings = nxCommandConfiguration.nxRunSettings
            nxRunSettings.nxTargets == nxTarget &&
                nxRunSettings.nxProjects == nxProject &&
                nxRunSettings.nxTargetsConfiguration == nxTargetConfiguration
        }
        ?: runManager
            .createConfiguration(
                "$nxProject:$nxTarget${if(nxTargetConfiguration.isBlank().not()) ":$nxTargetConfiguration" else ""}",
                NxCommandConfigurationType::class.java
            )
            .apply {
                (configuration as NxCommandConfiguration).apply {
                    nxRunSettings =
                        NxRunSettings(
                            nxProjects = nxProject,
                            nxTargets = nxTarget,
                            nxTargetsConfiguration = nxTargetConfiguration,
                            arguments = args.drop(1).joinToString(" "),
                        )
                }
            }
}
