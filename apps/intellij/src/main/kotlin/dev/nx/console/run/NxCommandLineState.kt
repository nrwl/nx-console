package dev.nx.console.run

import com.intellij.execution.configurations.CommandLineState
import com.intellij.execution.process.KillableColoredProcessHandler
import com.intellij.execution.process.ProcessHandler
import com.intellij.execution.process.ProcessTerminatedListener
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.javascript.nodejs.NodeConsoleAdditionalFilter
import com.intellij.javascript.nodejs.NodeStackTraceFilter
import com.intellij.lang.javascript.buildTools.TypeScriptErrorConsoleFilter
import com.intellij.openapi.project.Project
import com.intellij.util.execution.ParametersListUtil
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.*

class NxCommandLineState(
    environment: ExecutionEnvironment,
    val runConfiguration: NxCommandConfiguration
) : CommandLineState(environment) {
    override fun startProcess(): ProcessHandler {
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

        TelemetryService.getInstance(project)
            .featureUsed("Nx Run - from context menu/target list/codelens")

        val commandLine =
            NxGeneralCommandLine(
                project,
                listOf(
                    *args,
                    *(ParametersListUtil.parseToArray(nxRunSettings.arguments)),
                ),
                nxRunSettings.environmentVariables
            )

        val handler = KillableColoredProcessHandler(commandLine)
        consoleBuilder.console.attachToProcess(handler)
        addConsoleFilters(
            NodeStackTraceFilter(project, project.nxBasePath),
            NodeConsoleAdditionalFilter(project, project.nxBasePath),
            TypeScriptErrorConsoleFilter(project, project.nxBasePath),
        )
        ProcessTerminatedListener.attach(handler) // shows exit code upon termination
        return handler
    }
}
