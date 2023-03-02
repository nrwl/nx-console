package dev.nx.console.run

import com.intellij.execution.configurations.CommandLineState
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.KillableColoredProcessHandler
import com.intellij.execution.process.ProcessHandler
import com.intellij.execution.process.ProcessTerminatedListener
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.javascript.nodejs.NodeCommandLineUtil
import com.intellij.javascript.nodejs.NodeConsoleAdditionalFilter
import com.intellij.javascript.nodejs.NodeStackTraceFilter
import com.intellij.lang.javascript.buildTools.TypeScriptErrorConsoleFilter
import com.intellij.openapi.project.Project
import com.intellij.util.execution.ParametersListUtil
import dev.nx.console.utils.NxExecutable
import dev.nx.console.utils.nxBasePath

class NxCommandLineState(
    environment: ExecutionEnvironment,
    val runConfiguration: NxCommandConfiguration
) : CommandLineState(environment) {
    override fun startProcess(): ProcessHandler {
        val project: Project = environment.project
        val nxExecutable = NxExecutable.getExecutablePath(project.nxBasePath)
        val nxProjects = runConfiguration.nxProjects.split(",")
        val nxTargets = runConfiguration.nxTargets.split(",")
        val args =
            if (nxProjects.size > 1 || nxTargets.size > 1)
                arrayOf(
                    "run-many",
                    "--targets=${nxTargets.joinToString(separator = ",")}",
                    "--projects=${nxProjects.joinToString(separator = ",")}",
                )
            else arrayOf("run", "${nxProjects.first()}:${nxTargets.first()}")

        val commandLine =
            GeneralCommandLine().apply {
                exePath = nxExecutable
                addParameters(
                    listOf(
                        *args,
                        *(ParametersListUtil.parseToArray(runConfiguration.arguments)),
                    )
                )
                setWorkDirectory(project.nxBasePath)
                withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE)

                NodeCommandLineUtil.configureUsefulEnvironment(this)
            }

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
