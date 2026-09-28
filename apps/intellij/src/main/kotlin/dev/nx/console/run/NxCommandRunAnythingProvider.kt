package dev.nx.console.run

import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.ide.actions.runAnything.RunAnythingAction
import com.intellij.ide.actions.runAnything.RunAnythingUtil
import com.intellij.ide.actions.runAnything.activity.RunAnythingCommandLineProvider
import com.intellij.ide.actions.runAnything.items.RunAnythingItemBase
import com.intellij.openapi.actionSystem.DataContext
import dev.nx.console.NxIcons
import dev.nx.console.utils.NxWorkspaceSyncAccessService
import javax.swing.Icon

internal class NxCommandRunAnythingProvider : RunAnythingCommandLineProvider() {

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
        val task = args.firstOrNull() ?: return false
        val nxProject = task.substringBefore(":")
        val nxTarget = task.substringAfter(":")
        val executor =
            dataContext.getData(RunAnythingAction.EXECUTOR_KEY)
                ?: DefaultRunExecutor.getRunExecutorInstance()

        NxTaskExecutionManager.getInstance(project).execute(nxProject, nxTarget, "", args, executor)

        return true
    }

    override fun suggestCompletionVariants(
        dataContext: DataContext,
        commandLine: CommandLine,
    ): Sequence<String> {
        val project = RunAnythingUtil.fetchProject(dataContext)

        // Run Anything queries this on the EDT, so only the already-synced workspace may be read
        // here. Requesting it from nxls would block the UI until the language server answers.
        val targets =
            NxWorkspaceSyncAccessService.getInstance(project)
                .nxWorkspaceSync
                ?.projectGraph
                ?.nodes
                ?.entries
                ?.associate { entry -> entry.key to (entry.value.data.targets?.keys ?: emptySet()) }
                ?: emptyMap()

        val completeTasks = targets.flatMap { entry -> entry.value.map { entry.key + ":" + it } }

        return if (completeTasks.any { it in commandLine }) emptySequence()
        else completeTasks.asSequence()
    }

    companion object {
        const val HELP_COMMAND = "nx run"
    }
}
