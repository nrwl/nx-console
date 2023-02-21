package dev.nx.console.generate_ui.run_generator

import com.intellij.execution.ExecutionException
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.process.KillableColoredProcessHandler
import com.intellij.execution.process.ProcessEvent
import com.intellij.execution.process.ProcessListener
import com.intellij.execution.ui.RunContentDescriptor
import com.intellij.execution.ui.RunContentManager
import com.intellij.javascript.nodejs.NodeCommandLineUtil
import com.intellij.javascript.nodejs.npm.NpmPackageDescriptor
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import dev.nx.console.NxConsoleBundle
import dev.nx.console.NxIcons
import java.nio.file.Paths

val log = logger<RunGeneratorManager>()

class RunGeneratorManager(val project: Project) {

    private var queuedGeneratorDefinition: List<String>? = null
    private var runningProcessHandler: KillableColoredProcessHandler? = null

    fun queueGeneratorToBeRun(
        generator: String,
        flags: List<String>,
    ) {

        val generatorDefinition = listOf("g", generator, *flags.toTypedArray())
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
        try {
            ApplicationManager.getApplication()
                .invokeLater(
                    {
                        val binPath =
                            Paths.get(project.basePath ?: ".", "node_modules", ".bin").toString()
                        log.info("Using ${binPath} as base to find local nx binary")
                        val nxPackage =
                            NpmPackageDescriptor.findLocalBinaryFilePackage(binPath, "nx")
                                ?: throw ExecutionException(NxConsoleBundle.message("nx.not.found"))

                        val commandLine =
                            GeneralCommandLine().apply {
                                exePath = nxPackage.systemDependentPath
                                addParameters(definition)
                                setWorkDirectory(project.basePath)
                                withParentEnvironmentType(
                                    GeneralCommandLine.ParentEnvironmentType.CONSOLE
                                )

                                NodeCommandLineUtil.configureUsefulEnvironment(this)
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
            thisLogger().info("Cannot execute command", e)
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
}
