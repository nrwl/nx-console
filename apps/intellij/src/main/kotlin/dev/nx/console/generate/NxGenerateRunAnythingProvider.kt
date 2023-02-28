package dev.nx.console.generate

import com.intellij.execution.executors.DefaultDebugExecutor
import com.intellij.ide.actions.runAnything.RunAnythingAction
import com.intellij.ide.actions.runAnything.RunAnythingUtil
import com.intellij.ide.actions.runAnything.activity.RunAnythingCommandLineProvider
import com.intellij.ide.actions.runAnything.items.RunAnythingItemBase
import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import dev.nx.console.NxConsoleBundle
import dev.nx.console.NxIcons
import dev.nx.console.generate.run_generator.RunGeneratorManager
import dev.nx.console.models.NxGenerator
import dev.nx.console.nxls.server.requests.NxGeneratorOptionsRequestOptions
import dev.nx.console.services.NxlsService
import javax.swing.Icon
import kotlinx.coroutines.runBlocking

class NxGenerateRunAnythingProvider : RunAnythingCommandLineProvider() {

    override fun getIcon(value: String): Icon = NxIcons.Action

    override fun getHelpGroupTitle() = "Nx"
    override fun execute(dataContext: DataContext, value: String) {
        super.execute(dataContext, value)
    }

    override fun getCompletionGroupTitle(): String {
        return "Nx Generate"
    }

    override fun getHelpCommandPlaceholder(): String {
        return "nx generate <generator>"
    }

    override fun getAdText(): String = getAdDebugText()

    private fun getAdDebugText(): String {
        return NxConsoleBundle.message(
            "nx.run.anything.ad.run.with.debug",
            RunAnythingUtil.SHIFT_SHORTCUT_TEXT
        )
    }

    override fun getHelpCommand(): String {
        return HELP_COMMAND
    }

    override fun getHelpCommandAliases(): List<String> {
        return listOf("nx g")
    }

    override fun getHelpIcon(): Icon = NxIcons.Action

    override fun getMainListItem(dataContext: DataContext, value: String) =
        RunAnythingItemBase(getCommand(value), NxIcons.Action)

    override fun run(dataContext: DataContext, commandLine: CommandLine): Boolean {
        val project = RunAnythingUtil.fetchProject(dataContext)
        val runGeneratorManager = RunGeneratorManager(project)
        val executor = dataContext.getData(RunAnythingAction.EXECUTOR_KEY)
        val args = commandLine.parameters.toMutableList()
        if (args.isEmpty()) {
            return false
        }
        if (executor is DefaultDebugExecutor && "--dryRun" !in args && "--dry-run" !in args) {
            args.add("--dry-run")
        }
        runGeneratorManager.queueGeneratorToBeRun(args.first(), args.drop(1))
        return true
    }

    override fun suggestCompletionVariants(
        dataContext: DataContext,
        commandLine: CommandLine
    ): Sequence<String> {
        val project = RunAnythingUtil.fetchProject(dataContext)
        val generators: List<NxGenerator> = runBlocking {
            project.service<NxlsService>().generators()
        }

        val completeGeneratorNames = completeGeneratorNames(commandLine, generators).sorted()
        val completeOptions =
            completeOptions(RunAnythingUtil.fetchProject(dataContext), commandLine, generators)
                .sorted()

        return when {
            commandLine.toComplete.startsWith("--") -> completeOptions + completeGeneratorNames
            commandLine.toComplete.startsWith("-") -> completeOptions + completeGeneratorNames
            else -> completeGeneratorNames + completeOptions
        }
    }

    private fun completeGeneratorNames(
        commandLine: CommandLine,
        generators: List<NxGenerator>
    ): Sequence<String> {
        return if (generators.any { it.name in commandLine }) emptySequence()
        else generators.map { it.name }.asSequence()
    }

    private fun completeOptions(
        project: Project,
        commandLine: CommandLine,
        generators: List<NxGenerator>
    ): Sequence<String> {
        val generator = hasGenerator(commandLine, generators) ?: return emptySequence()
        val generatorOptions = runBlocking {
            NxlsService.getInstance(project)
                .generatorOptions(
                    NxGeneratorOptionsRequestOptions(
                        collection = generator.data.collection,
                        name = generator.name,
                        path = generator.path
                    )
                )
        }
        return generatorOptions.map { "--${it.name}" }.filterNot { it in commandLine }.asSequence()
    }

    private fun hasGenerator(
        commandLine: CommandLine,
        generators: List<NxGenerator>
    ): NxGenerator? = generators.find { commandLine.completedParameters.contains(it.name) }

    companion object {
        const val HELP_COMMAND = "nx generate"
    }
}
