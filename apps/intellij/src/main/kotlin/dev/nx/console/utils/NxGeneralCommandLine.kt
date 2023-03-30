package dev.nx.console.utils

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.wsl.WSLCommandLineOptions
import com.intellij.javascript.nodejs.NodeCommandLineUtil
import com.intellij.openapi.project.Project

fun NxGeneralCommandLine(project: Project, args: List<String>) =
    GeneralCommandLine().apply {
        exePath = NxExecutable.getExecutablePath(project.nxBasePath)
        addParameters(args)
        setWorkDirectory(project.nxBasePath)
        withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE)

        NodeCommandLineUtil.configureUsefulEnvironment(this)
        NodeCommandLineUtil.prependNodeDirToPATH(this, project.nodeInterpreter)

        project.nodeInterpreter.let {
            if (isWslInterpreter(it)) {
                val options =
                    WSLCommandLineOptions().apply {
                        initShellCommands.add(it.prependNodeDirToPathCommand)
                        remoteWorkingDirectory = nxlsWorkingPath(project.nxBasePath)
                    }

                it.distribution.patchCommandLine(this, project, options)
            }
        }
    }
