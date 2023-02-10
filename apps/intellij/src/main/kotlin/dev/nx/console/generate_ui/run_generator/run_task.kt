package dev.nx.console.generate_ui.run_generator

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.process.OSProcessHandler
import com.intellij.execution.process.ProcessHandler
import com.intellij.execution.ui.RunContentDescriptor
import com.intellij.execution.ui.RunContentManager
import com.intellij.javascript.nodejs.interpreter.NodeJsInterpreterManager
import com.intellij.javascript.nodejs.npm.NpmUtil
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import dev.nx.console.NxIcons
import io.ktor.utils.io.errors.*

fun runGenerator(
    generator: String,
    flags: List<String>,
    project: Project,
): Unit {
    val args: List<String> = listOf("nx", "g", generator, *flags.toTypedArray())

    val npmPackageRef = NpmUtil.createProjectPackageManagerPackageRef()
    val npmPkgManager =
        NpmUtil.resolveRef(
            npmPackageRef,
            project,
            NodeJsInterpreterManager.getInstance(project).interpreter
        )
    val pkgManagerExecCommand: String =
        if (npmPkgManager != null && NpmUtil.isYarnAlikePackage(npmPkgManager)) {
            "yarn"
        } else if (npmPkgManager != null && NpmUtil.isPnpmPackage(npmPkgManager)) {
            "pnpm exec"
        } else {
            "npx"
        }

    try {
        ApplicationManager.getApplication()
            .invokeLater(
                {
                    val commandLine = GeneralCommandLine()
                    commandLine.setExePath(pkgManagerExecCommand)
                    commandLine.addParameters(args)
                    commandLine.setWorkDirectory(project.basePath)

                    val processHandler: ProcessHandler = OSProcessHandler(commandLine)
                    processHandler.startNotify()

                    val consoleBuilder =
                        TextConsoleBuilderFactory.getInstance().createBuilder(project)
                    val console = consoleBuilder.console
                    console.attachToProcess(processHandler)

                    val contentDescriptor =
                        RunContentDescriptor(
                            console,
                            processHandler,
                            console.component,
                            "Nx Generate",
                            NxIcons.Action
                        )

                    val runContentManager = RunContentManager.getInstance(project)
                    runContentManager.showRunContent(
                        DefaultRunExecutor.getRunExecutorInstance(),
                        contentDescriptor
                    )
                },
                ModalityState.defaultModalityState()
            )
    } catch (e: Exception) {
        logger<String>().warn("Cannot execute command", e)
    }
}
