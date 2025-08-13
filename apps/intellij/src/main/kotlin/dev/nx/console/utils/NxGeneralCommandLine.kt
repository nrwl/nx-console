package dev.nx.console.utils

import com.intellij.execution.configuration.EnvironmentVariablesData
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.wsl.WSLCommandLineOptions
import com.intellij.javascript.nodejs.NodeCommandLineUtil
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.SystemInfo
import java.nio.file.Path

fun NxGeneralCommandLine(
    project: Project,
    args: List<String>,
    environmentVariables: EnvironmentVariablesData = EnvironmentVariablesData.DEFAULT,
    cwd: String? = null,
) =
    GeneralCommandLine().apply {
        val workDirectory =
            if (cwd !== null) Path.of(project.nxBasePath, cwd).toString() else project.nxBasePath
        
        // Check if Corepack should be used
        val corepackPm = CorepackDetection.detectCorepackPackageManager(project.nxBasePath)
        if (corepackPm != null) {
            // Use corepack to run the correct package manager
            val pmName = CorepackDetection.extractPackageManagerName(corepackPm)
            exePath = "corepack"
            
            // Determine the appropriate exec command based on package manager
            when (pmName) {
                "yarn" -> {
                    addParameters("yarn")
                    addParameters("nx")
                }
                "pnpm" -> {
                    addParameters("pnpm")
                    addParameters("exec")
                    addParameters("nx")
                }
                "npm" -> {
                    addParameters("npx")
                    addParameters("nx")
                }
                else -> {
                    // Fallback to standard approach
                    exePath = NxExecutable.getExecutablePath(project.nxBasePath, project)
                }
            }
            addParameters(args)
        } else {
            // Standard approach when not using Corepack
            exePath = NxExecutable.getExecutablePath(project.nxBasePath, project)
            addParameters(args)
        }
        
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

fun NxLatestVersionGeneralCommandLine(
    project: Project,
    args: List<String>,
    environmentVariables: EnvironmentVariablesData = EnvironmentVariablesData.DEFAULT,
    cwd: String? = null,
) =
    GeneralCommandLine().apply {
        val workDirectory =
            if (cwd !== null) Path.of(project.nxBasePath, cwd).toString() else project.nxBasePath
        
        // Check if Corepack should be used
        val corepackPm = CorepackDetection.detectCorepackPackageManager(project.nxBasePath)
        if (corepackPm != null) {
            // Use corepack with the package manager's exec command
            val pmName = CorepackDetection.extractPackageManagerName(corepackPm)
            exePath = "corepack"
            
            when (pmName) {
                "yarn" -> {
                    addParameters("yarn")
                    addParameters("dlx")
                }
                "pnpm" -> {
                    addParameters("pnpm")
                    addParameters("dlx")
                }
                "npm" -> {
                    addParameters("npx")
                    addParameters("-y")
                }
                else -> {
                    // Fallback to npx
                    exePath = if (SystemInfo.isWindows) "npx.cmd" else "npx"
                    addParameters("-y")
                }
            }
        } else {
            // Standard approach when not using Corepack
            exePath = if (SystemInfo.isWindows) "npx.cmd" else "npx"
            addParameters("-y")
        }
        
        addParameters("nx@latest")
        addParameters(args)
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
