package dev.nx.console.run

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.process.KillableColoredProcessHandler
import com.intellij.execution.ui.RunContentDescriptor
import com.intellij.execution.ui.RunContentManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import dev.nx.console.NxIcons
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.nxBasePath
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Service(Service.Level.PROJECT)
class NxHelpCommandService(val project: Project) {
    fun execute(projectName: String, helpCommand: String) {
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

                    nxProject?.root?.also {
                        withWorkDirectory(File(project.nxBasePath).resolve(it))
                    }
                }

            val processHandler = KillableColoredProcessHandler(commandLine)
            val console = TextConsoleBuilderFactory.getInstance().createBuilder(project).console

            console.attachToProcess(processHandler)

            withContext(Dispatchers.EDT) {
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

    companion object {
        fun getInstance(project: Project): NxHelpCommandService =
            project.getService(NxHelpCommandService::class.java)
    }
}
