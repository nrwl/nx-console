package dev.nx.console.generate.run_generator

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

    private fun runGenerator(definition: List<String>) {
        val pkgManagerExecCommand: List<String> = getPackageManagerExecCommand()
        val pkgManagerExecutable = pkgManagerExecCommand.get(0)
        val pkgManagerParameters =
            pkgManagerExecCommand.let {
                if (it.size == 1) emptyList() else it.subList(1, it.size)
            } + definition

        try {
            ApplicationManager.getApplication()
                .invokeLater(
                    {
                        val commandLine =
                            GeneralCommandLine().apply {
                                setExePath(pkgManagerExecutable)
                                addParameters(pkgManagerParameters)
                                setWorkDirectory(project.basePath)
                                withParentEnvironmentType(
                                    GeneralCommandLine.ParentEnvironmentType.CONSOLE
                                )
                                val env =
                                    this.parentEnvironment.toMap() + mapOf("FORCE_COLOR" to "2")
                                withEnvironment(env)
                            }

                        val processHandler = KillableColoredProcessHandler(commandLine)

                        val consoleBuilder =
                            TextConsoleBuilderFactory.getInstance().createBuilder(project)
                        val console = consoleBuilder.console
                        project.basePath?.let {
                            console.addMessageFilter(NxGeneratorMessageFilter(project, it))
                        }
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

    private fun getPackageManagerExecCommand(): List<String> {
        val npmPackageRef = NpmUtil.createProjectPackageManagerPackageRef()
        val npmPkgManager =
            NpmUtil.resolveRef(
                npmPackageRef,
                project,
                NodeJsInterpreterManager.getInstance(project).interpreter
            )
        val pkgManagerExecCommand: List<String> =
            if (npmPkgManager != null && NpmUtil.isYarnAlikePackage(npmPkgManager)) {
                listOf("yarn")
            } else if (npmPkgManager != null && NpmUtil.isPnpmPackage(npmPkgManager)) {
                listOf("pnpm", "exec")
            } else {
                listOf("npx")
            }
        return pkgManagerExecCommand
    }
}
