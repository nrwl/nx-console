package dev.nx.console.utils

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.wsl.WSLCommandLineOptions
import com.intellij.javascript.nodejs.NodeCommandLineUtil
import com.intellij.javascript.nodejs.interpreter.wsl.WslNodeInterpreter
import com.intellij.openapi.project.Project


fun NxGeneralCommandLine(project: Project, args: List<String>) = GeneralCommandLine().apply {
    exePath = NxExecutable.getExecutablePath(project.nxBasePath)
    addParameters(args)
    setWorkDirectory(project.nxBasePath)
    withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE)

    NodeCommandLineUtil.configureUsefulEnvironment(this)
    NodeCommandLineUtil.prependNodeDirToPATH(this, project.nodeInterpreter)

    project.nodeInterpreter.let {
        if (isWslInterpreter(it)) {
            val distribution = it.distribution

            val nodeExportPath = it.prependNodeDirToPathCommand

            val options =
                WSLCommandLineOptions().apply {
                    initShellCommands.add(nodeExportPath)
                    remoteWorkingDirectory = nxlsWorkingPath(project.nxBasePath)
                }

            distribution.patchCommandLine(this, project, options)
        }
    }

}