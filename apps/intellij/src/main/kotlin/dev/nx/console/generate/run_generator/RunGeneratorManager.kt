package dev.nx.console.generate.run_generator

import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.process.KillableColoredProcessHandler
import com.intellij.execution.process.ProcessEvent
import com.intellij.execution.process.ProcessHandler
import com.intellij.execution.process.ProcessListener
import com.intellij.execution.ui.ConsoleView
import com.intellij.execution.ui.RunContentDescriptor
import com.intellij.execution.ui.RunContentManager
import com.intellij.lang.javascript.modules.ConsoleProgress
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VfsUtil
import dev.nx.console.NxIcons
import dev.nx.console.utils.NxGeneralCommandLine
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.nxBasePath
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.resume
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext

val log = logger<RunGeneratorManager>()

class RunGeneratorManager
internal constructor(
    val project: Project,
    private val createProcess: (List<String>, String?) -> KillableColoredProcessHandler,
) {
    constructor(
        project: Project
    ) : this(
        project,
        { definition, cwd ->
            KillableColoredProcessHandler(NxGeneralCommandLine(project, definition, cwd = cwd))
        },
    )

    private data class Request(val definition: List<String>, val cwd: String?)

    private var queuedRequest: Request? = null
    private var activeRequest: Request? = null
    private var runningProcessHandler: KillableColoredProcessHandler? = null
    private var lastDryRunDescriptor: RunContentDescriptor? = null

    fun queueGeneratorToBeRun(generator: String, flags: List<String>, cwd: String? = null) {
        var generatorDefinition: List<String>
        if (generator.matches(Regex("^workspace-(schematic|generator):(.+)"))) {
            generatorDefinition =
                listOf(
                    "workspace-generator",
                    generator.replace(Regex("^workspace-(schematic|generator):"), ""),
                    *flags.toTypedArray(),
                )
        } else {
            generatorDefinition = listOf("g", generator, *flags.toTypedArray())
        }

        val request = Request(generatorDefinition, cwd)
        val application = ApplicationManager.getApplication()
        if (application.isDispatchThread) enqueue(request)
        else application.invokeLater { enqueue(request) }
    }

    private fun enqueue(request: Request) {
        if (project.isDisposed) return
        queuedRequest = request
        if (activeRequest == null) {
            startNext()
        } else if (activeRequest?.definition?.isDryRun() == true) {
            runningProcessHandler?.killProcess()
        }
    }

    private fun startNext() {
        val request = queuedRequest ?: return
        queuedRequest = null
        activeRequest = request
        val scope = ProjectLevelCoroutineHolderService.getInstance(project).cs
        scope.launch {
            var processHandler: KillableColoredProcessHandler? = null
            var console: ConsoleView? = null
            var contentShown = false
            try {
                withContext(Dispatchers.IO) {
                    processHandler = createProcess(request.definition, request.cwd)
                }
                val process = checkNotNull(processHandler)
                withContext(Dispatchers.EDT) {
                    val view =
                        TextConsoleBuilderFactory.getInstance()
                            .createBuilder(project)
                            .filters(NxGeneratorMessageFilter(project, project.nxBasePath))
                            .console
                    console = view
                    view.attachToProcess(process)
                    ConsoleProgress.install(view, process)
                    showRunContent(view, process, request.definition.isDryRun())
                    contentShown = true
                    runningProcessHandler = process
                    process.startNotify()
                    if (queuedRequest != null && request.definition.isDryRun())
                        process.killProcess()
                }
                awaitTermination(process)
                if (!request.definition.isDryRun()) {
                    withContext(Dispatchers.IO) {
                        VfsUtil.markDirtyAndRefresh(
                            true,
                            true,
                            true,
                            VfsUtil.findFileByIoFile(File(project.nxBasePath), true),
                        )
                    }
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: ProcessCanceledException) {
                throw error
            } catch (error: Exception) {
                log.info("Cannot execute command", error)
            } finally {
                withContext(NonCancellable) {
                    processHandler?.let {
                        // ProcessHandler defers destruction until startNotify, including when
                        // startup
                        // is cancelled before a console can be attached.
                        if (!it.isStartNotified) it.startNotify()
                        if (!it.isProcessTerminated) it.destroyProcess()
                    }
                    withContext(Dispatchers.EDT) {
                        if (!contentShown) console?.let(Disposer::dispose)
                        runningProcessHandler = null
                        activeRequest = null
                        if (scope.isActive && !project.isDisposed) startNext()
                    }
                }
            }
        }
    }

    private suspend fun awaitTermination(process: ProcessHandler) =
        suspendCancellableCoroutine<Unit> { continuation ->
            val completed = AtomicBoolean()
            val listener =
                object : ProcessListener {
                    override fun processTerminated(event: ProcessEvent) {
                        process.removeProcessListener(this)
                        if (completed.compareAndSet(false, true)) continuation.resume(Unit)
                    }
                }
            process.addProcessListener(listener)
            continuation.invokeOnCancellation { process.removeProcessListener(listener) }
            if (process.isProcessTerminated) {
                process.removeProcessListener(listener)
                if (completed.compareAndSet(false, true)) continuation.resume(Unit)
            }
        }

    internal fun showRunContent(
        console: ConsoleView,
        processHandler: ProcessHandler,
        dryRun: Boolean,
    ) {
        val contentDescriptor =
            RunContentDescriptor(
                console,
                processHandler,
                console.component,
                "Nx Generate",
                NxIcons.Action,
            )

        // The Run tool window never reuses a pinned tab on its own, and new tabs are pinned when
        // "start.run.configurations.pinned" is enabled. Passing the previous dry run explicitly
        // keeps dry runs triggered by form changes in a single tab either way.
        RunContentManager.getInstance(project)
            .showRunContent(
                DefaultRunExecutor.getRunExecutorInstance(),
                contentDescriptor,
                lastDryRunDescriptor,
            )
        lastDryRunDescriptor = contentDescriptor.takeIf { dryRun }
    }
}

private fun List<String>.isDryRun(): Boolean {
    return this.contains("--dry-run") || this.contains("--dryRun")
}
