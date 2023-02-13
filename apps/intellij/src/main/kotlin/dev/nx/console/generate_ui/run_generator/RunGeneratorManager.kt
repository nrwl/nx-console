package dev.nx.console.generate_ui.run_generator

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.process.KillableColoredProcessHandler
import com.intellij.execution.process.ProcessEvent
import com.intellij.execution.process.ProcessListener
import com.intellij.execution.ui.RunContentDescriptor
import com.intellij.execution.ui.RunContentManager
import com.intellij.javascript.nodejs.interpreter.NodeJsInterpreterManager
import com.intellij.javascript.nodejs.npm.NpmUtil
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import dev.nx.console.NxIcons

class RunGeneratorManager(val project: Project) {

    private var queuedGeneratorDefinition: List<String>? = null
    private var runningProcessHandler: KillableColoredProcessHandler? = null

    fun queueGeneratorToBeRun(
        generator: String,
        flags: List<String>,
    ) {

        val generatorDefinition = listOf("nx", "g", generator, *flags.toTypedArray())
        runningProcessHandler.let {
            if (it == null) {
                runGenerator(generatorDefinition)
                return
            }
            if (it.commandLine.contains("--dry-run")) {
                it.killProcess()
            }
            queuedGeneratorDefinition = generatorDefinition
            it.addProcessListener(
                object : ProcessListener {
                    override fun processTerminated(event: ProcessEvent) {
                        queuedGeneratorDefinition?.let { definition -> runGenerator(definition) }
                        queuedGeneratorDefinition = null
                    }
                }
            )
        }
    }

    private fun runGenerator(definition: List<String>): Unit {
        val pkgManagerExecCommand = getPackageManagerExecCommand()
        try {
            ApplicationManager.getApplication()
                .invokeLater(
                    {
                        val commandLine =
                            GeneralCommandLine().apply {
                                setExePath(pkgManagerExecCommand)
                                addParameters(definition)
                                setWorkDirectory(project.basePath)
                                withParentEnvironmentType(
                                    GeneralCommandLine.ParentEnvironmentType.CONSOLE
                                )
                                withEnvironment("FORCE_COLOR", "2")
                            }

                        val processHandler = KillableColoredProcessHandler(commandLine)

                        val consoleBuilder =
                            TextConsoleBuilderFactory.getInstance().createBuilder(project)
                        val console = consoleBuilder.console
                        console.attachToProcess(processHandler)
                        processHandler.startNotify()

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

                        this.setProcessHandler(processHandler)
                    },
                    ModalityState.defaultModalityState()
                )
        } catch (e: Exception) {
            logger<String>().warn("Cannot execute command", e)
        }
    }

    private fun setProcessHandler(processHandler: KillableColoredProcessHandler) {
        processHandler.addProcessListener(
            object : ProcessListener {
                override fun processTerminated(event: ProcessEvent) {
                    runningProcessHandler = null
                }
            }
        )
        runningProcessHandler = processHandler
    }

    private fun getPackageManagerExecCommand(): String {
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
        return pkgManagerExecCommand
    }
}
