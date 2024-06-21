package dev.nx.console.run

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.process.KillableColoredProcessHandler
import com.intellij.execution.ui.RunContentDescriptor
import com.intellij.execution.ui.RunContentManager
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import dev.nx.console.NxIcons
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.nxBasePath
import java.io.File
import javax.swing.SwingUtilities
import kotlinx.coroutines.launch

fun runGeneralCommand(project: Project, projectName: String, helpCommand: String) {
    val nxlsService = project.service<NxlsService>()

    ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
        val nxProject =
            nxlsService
                .workspace()
                ?.workspace
                ?.projects
                ?.entries
                ?.find { it.key == projectName }
                ?.value

        val commandLine =
            GeneralCommandLine().apply {
                val (cmd, args) = helpCommand.split(" ", limit = 2)
                exePath = cmd
                addParameters(args.split(" "))
                withCharset(Charsets.UTF_8)

                nxProject?.root?.also { withWorkDirectory(File(project.nxBasePath).resolve(it)) }
            }

        val processHandler = KillableColoredProcessHandler(commandLine)
        val console = TextConsoleBuilderFactory.getInstance().createBuilder(project).console

        console.attachToProcess(processHandler)

        SwingUtilities.invokeLater {
            val contentDescriptor =
                RunContentDescriptor(
                    console,
                    processHandler,
                    console.component,
                    "Help",
                    NxIcons.Action
                )
            val runContentManager = RunContentManager.getInstance(project)
            runContentManager.showRunContent(
                DefaultRunExecutor.getRunExecutorInstance(),
                contentDescriptor
            )
            processHandler.startNotify()
        }
    }
}
