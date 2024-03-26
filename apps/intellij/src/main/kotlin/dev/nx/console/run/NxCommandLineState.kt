package dev.nx.console.run

import com.intellij.execution.DefaultExecutionResult
import com.intellij.execution.ExecutionResult
import com.intellij.execution.process.ProcessHandler
import com.intellij.execution.process.ProcessTerminatedListener
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.execution.target.value.TargetValue
import com.intellij.execution.wsl.WslPath
import com.intellij.javascript.debugger.CommandLineDebugConfigurator
import com.intellij.javascript.nodejs.NodeCommandLineUtil
import com.intellij.javascript.nodejs.NodeCommandLineUtil.createConsole
import com.intellij.javascript.nodejs.debug.NodeCommandLineOwner
import com.intellij.javascript.nodejs.execution.NodeBaseRunProfileState
import com.intellij.javascript.nodejs.execution.NodeTargetRun
import com.intellij.javascript.nodejs.execution.NodeTargetRunOptions
import com.intellij.javascript.nodejs.npm.*
import com.intellij.openapi.project.Project
import com.intellij.util.execution.ParametersListUtil
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.*

class NxCommandLineState(
    val environment: ExecutionEnvironment,
    val runConfiguration: NxCommandConfiguration
) : NodeBaseRunProfileState, NodeCommandLineOwner {
    override fun createExecutionResult(processHandler: ProcessHandler): ExecutionResult {
        ProcessTerminatedListener.attach(processHandler)
        val console = createConsole(processHandler, environment.project, true)
        console.attachToProcess(processHandler)
        foldCommandLine(console, processHandler)
        return DefaultExecutionResult(console, processHandler)
    }

    override fun startProcess(configurator: CommandLineDebugConfigurator?): ProcessHandler {
        val project: Project = environment.project
        val nxRunSettings = runConfiguration.nxRunSettings
        val nxProjects = nxRunSettings.nxProjects.split(",")
        val nxTargets = nxRunSettings.nxTargets.split(",")
        val nxTargetsConfiguration = nxRunSettings.nxTargetsConfiguration
        val args =
            if (nxProjects.size > 1 || nxTargets.size > 1) {
                val array =
                    arrayOf(
                        "run-many",
                        "--targets=${nxTargets.joinToString(separator = ",")}",
                        "--projects=${nxProjects.joinToString(separator = ",")}",
                    )
                if (nxTargetsConfiguration.isNullOrBlank().not()) {
                    array + "-c $nxTargetsConfiguration"
                } else {
                    array
                }
            } else
                arrayOf(
                    "run",
                    "${nxProjects.first()}:${nxTargets.first()}${if(nxTargetsConfiguration.isNullOrBlank().not()) ":$nxTargetsConfiguration" else ""}"
                )

        if (configurator === null) {
            TelemetryService.getInstance(project)
                .featureUsed("Nx Run - from context menu/target list/codelens - debug")
        } else {
            TelemetryService.getInstance(project)
                .featureUsed("Nx Run - from context menu/target list/codelens")
        }

        val targetRun =
            NodeTargetRun(
                    project.nodeInterpreter,
                    project,
                    configurator,
                    NodeTargetRunOptions.of(true, runConfiguration)
                )
                .apply {
                    envData = nxRunSettings.environmentVariables
                    enableWrappingWithYarnNode = false
                }

        NodeCommandLineUtil.prependNodeDirToPATH(
            nxRunSettings.environmentVariables.envs,
            project.nodeInterpreter
        )

        targetRun.commandLineBuilder.apply {
            exePath = TargetValue.fixed(NxExecutable.getExecutablePath(project.nxBasePath, project))

            addParameters(
                listOf(
                    *args,
                    *(ParametersListUtil.parseToArray(nxRunSettings.arguments)),
                )
            )

            setWorkingDirectory(
                WslPath.parseWindowsUncPath(project.nxBasePath)?.linuxPath ?: project.nxBasePath
            )
        }

        return targetRun.startProcess()
    }
}
