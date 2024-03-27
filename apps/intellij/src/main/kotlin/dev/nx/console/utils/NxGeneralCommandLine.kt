package dev.nx.console.utils

import com.intellij.execution.configuration.EnvironmentVariablesData
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.wsl.WSLCommandLineOptions
import com.intellij.javascript.nodejs.NodeCommandLineUtil
import com.intellij.openapi.project.Project
import java.nio.file.Path

fun NxGeneralCommandLine(
    project: Project,
    args: List<String>,
    environmentVariables: EnvironmentVariablesData = EnvironmentVariablesData.DEFAULT,
    cwd: String? = null
) =
    GeneralCommandLine().apply {
        exePath = NxExecutable.getExecutablePath(project.nxBasePath, project)
        addParameters(args)
        val workDirectory =
            if (cwd !== null) Path.of(project.nxBasePath, cwd).toString() else project.nxBasePath
        setWorkDirectory(workDirectory)
        environmentVariables.configureCommandLine(this, true)

        NodeCommandLineUtil.configureUsefulEnvironment(this)
        NodeCommandLineUtil.prependNodeDirToPATH(this, project.nodeInterpreter)
        withCharset(Charsets.UTF_8)

        project.nodeInterpreter.let {
            if (isWslInterpreter(it)) {
                val options =
                    WSLCommandLineOptions().apply {
                        initShellCommands.add(it.prependNodeDirToPathCommand)
                        remoteWorkingDirectory = nxlsWorkingPath(workDirectory)
                    }

                it.distribution.patchCommandLine(this, project, options)
            }
        }
    }
