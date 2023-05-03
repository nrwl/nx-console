package dev.nx.console.run

import com.intellij.execution.Executor
import com.intellij.execution.RunManager
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.runners.ExecutionUtil
import com.intellij.ide.actions.runAnything.RunAnythingUtil
import com.intellij.ide.actions.runAnything.activity.RunAnythingCommandLineProvider
import com.intellij.ide.actions.runAnything.items.RunAnythingItemBase
import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.components.service
import dev.nx.console.NxIcons
import dev.nx.console.services.NxlsService
import javax.swing.Icon
import kotlinx.coroutines.runBlocking

class NxCommandRunAnythingProvider : RunAnythingCommandLineProvider() {

    override fun getIcon(value: String): Icon = NxIcons.Action

    override fun getHelpGroupTitle() = "Nx"
    override fun execute(dataContext: DataContext, value: String) {
        super.execute(dataContext, value)
    }

    override fun getCompletionGroupTitle(): String {
        return "Nx Run"
    }

    override fun getHelpCommandPlaceholder(): String {
        return "nx run <target> [options]"
    }

    override fun getHelpCommand(): String {
        return HELP_COMMAND
    }

    override fun getHelpIcon(): Icon = NxIcons.Action

    override fun getMainListItem(dataContext: DataContext, value: String) =
        RunAnythingItemBase(getCommand(value), NxIcons.Action)

    override fun run(dataContext: DataContext, commandLine: CommandLine): Boolean {
        val project = RunAnythingUtil.fetchProject(dataContext)
        val args = commandLine.parameters.toMutableList()
        val runManager = project.service<RunManager>()
        val task = args.firstOrNull() ?: return false
        val nxProject = task.substringBefore(":")
        val nxTarget = task.substringAfter(":")

        val runnerAndConfigurationSettings =
            getOrCreateRunnerConfigurationSettings(
                    project,
                    nxProject,
                    nxTarget,
                    null,
                    args,
                )
                .also { runManager.addConfiguration(it) }

        runManager.selectedConfiguration = runnerAndConfigurationSettings
        val executor: Executor = DefaultRunExecutor.getRunExecutorInstance()
        ExecutionUtil.runConfiguration(runnerAndConfigurationSettings, executor)
        return true
    }

    override fun suggestCompletionVariants(
        dataContext: DataContext,
        commandLine: CommandLine
    ): Sequence<String> {
        val project = RunAnythingUtil.fetchProject(dataContext)

        val targets = runBlocking {
            project
                .service<NxlsService>()
                .workspace()
                ?.workspace
                ?.projects
                ?.entries
                ?.map { entry -> entry.key to (entry.value?.targets?.keys ?: emptySet()) }
                ?.associate { it }
                ?: emptyMap()
        }

        val completeTasks = targets.flatMap { entry -> entry.value.map { entry.key + ":" + it } }

        return if (completeTasks.any { it in commandLine }) emptySequence()
        else completeTasks.asSequence()
    }

    companion object {
        const val HELP_COMMAND = "nx run"
    }
}
