package dev.nx.console.run

import com.intellij.execution.configurations.CommandLineState
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.KillableColoredProcessHandler
import com.intellij.execution.process.ProcessHandler
import com.intellij.execution.process.ProcessTerminatedListener
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.execution.wsl.WSLCommandLineOptions
import com.intellij.javascript.nodejs.NodeCommandLineUtil
import com.intellij.javascript.nodejs.NodeConsoleAdditionalFilter
import com.intellij.javascript.nodejs.NodeStackTraceFilter
import com.intellij.javascript.nodejs.interpreter.wsl.WslNodeInterpreter
import com.intellij.lang.javascript.buildTools.TypeScriptErrorConsoleFilter
import com.intellij.openapi.project.Project
import com.intellij.util.execution.ParametersListUtil
import dev.nx.console.utils.NxExecutable
import dev.nx.console.utils.nodeInterpreter
import dev.nx.console.utils.nxBasePath
import dev.nx.console.utils.nxlsWorkingPath

class NxCommandLineState(
    environment: ExecutionEnvironment,
    val runConfiguration: NxCommandConfiguration
) : CommandLineState(environment) {
    override fun startProcess(): ProcessHandler {
        val project: Project = environment.project
        val nxExecutable = NxExecutable.getExecutablePath(project.nxBasePath)
        val nxRunSettings = runConfiguration.nxRunSettings
        val nxProjects = nxRunSettings.nxProjects.split(",")
        val nxTargets = nxRunSettings.nxTargets.split(",")
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
                        *(ParametersListUtil.parseToArray(nxRunSettings.arguments)),
                    )
                )
                setWorkDirectory(project.nxBasePath)
                withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE)

                NodeCommandLineUtil.configureUsefulEnvironment(this)
                NodeCommandLineUtil.prependNodeDirToPATH(this, project.nodeInterpreter)

                if (project.nodeInterpreter is WslNodeInterpreter) {
                    val wslInterpreter = project.nodeInterpreter as WslNodeInterpreter;
                   val distribution = wslInterpreter.distribution

                   val nodeExportPath = wslInterpreter.prependNodeDirToPathCommand

                    val options = WSLCommandLineOptions().apply {
                        initShellCommands.add(nodeExportPath)
                        remoteWorkingDirectory = nxlsWorkingPath(project.nxBasePath)
                    }


                    distribution.patchCommandLine(this, project, options)


                } else {


                }


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
