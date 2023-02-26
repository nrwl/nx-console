package dev.nx.console.run

import com.intellij.execution.configurations.CommandLineState
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.KillableColoredProcessHandler
import com.intellij.execution.process.ProcessHandler
import com.intellij.execution.process.ProcessTerminatedListener
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.javascript.nodejs.NodeCommandLineUtil
import com.intellij.openapi.project.Project
import com.intellij.util.execution.ParametersListUtil
import dev.nx.console.utils.NxExecutable

class NxCommandLineState(
    environment: ExecutionEnvironment,
    val runConfiguration: NxCommandConfiguration
) : CommandLineState(environment) {
    override fun startProcess(): ProcessHandler {
        val project: Project = environment.project

        val nxExecutable =
            NxExecutable.getExecutablePath(
                project.basePath ?: throw Exception("Project base path does not exist")
            )

        val commandLine =
            GeneralCommandLine().apply {
                exePath = nxExecutable
                addParameters(
                    listOf(
                        "run",
                        runConfiguration.command,
                        *(ParametersListUtil.parseToArray(runConfiguration.arguments))
                    )
                )
                setWorkDirectory(project.basePath)
                withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE)

                NodeCommandLineUtil.configureUsefulEnvironment(this)
            }

        val handler = KillableColoredProcessHandler(commandLine)
        consoleBuilder.console.attachToProcess(handler)
        ProcessTerminatedListener.attach(handler) // shows exit code upon termination
        return handler
    }
}
