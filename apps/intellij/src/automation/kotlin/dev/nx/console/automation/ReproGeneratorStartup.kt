package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.jdk.getSystemProperty
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("dev.nx.console.generate.run_generator.RunGeneratorManager", plugin = "dev.nx.console")
interface GeneratorStartupManager {
    fun queueGeneratorToBeRun(generator: String, flags: List<String>, cwd: String?)
}

@Remote("com.intellij.execution.process.ProcessHandler")
interface GeneratorStartupProcess {
    fun isProcessTerminated(): Boolean

    fun getExitCode(): Int?
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    nxlsFrame()
    nxlsRunning(project)
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "generator-startup"
    val logPath = Path.of(getSystemProperty("idea.log.path"), "idea.log")
    val logOffset = logPath.readText().length
    val report = StringBuilder("Generator process startup from the dispatch thread\n")
    recordIde(label) {
        try {
            val initial =
                withContext(OnDispatcher.EDT) {
                    service<DryRunContentManager>(project).getAllDescriptors().toSet()
                }
            val manager = new(GeneratorStartupManager::class, project)
            withContext(OnDispatcher.EDT) {
                manager.queueGeneratorToBeRun(
                    "@fixture/notes-plugin:note",
                    listOf(
                        "--name=startup-regression",
                        "--directory=notes",
                        "--dry-run",
                        "--no-interactive",
                    ),
                    null,
                )
            }
            var descriptor: DryRunDescriptor? = null
            nxlsWait(90.seconds, { "The generator did not produce a finished Run console" }) {
                descriptor =
                    withContext(OnDispatcher.EDT) {
                        service<DryRunContentManager>(project).getAllDescriptors().firstOrNull {
                            it !in initial && it.getDisplayName() == "Nx Generate"
                        }
                    }
                descriptor?.getProcessHandler()?.isProcessTerminated() == true
            }
            val tab = checkNotNull(descriptor)
            val exitCode =
                cast(checkNotNull(tab.getProcessHandler()), GeneratorStartupProcess::class)
                    .getExitCode()
            val output =
                withContext(OnDispatcher.EDT) {
                    checkNotNull(tab.getExecutionConsole()).apply { flushDeferredText() }.getText()
                }
            report.appendLine("Exit code: $exitCode")
            report.appendLine(output)
            Thread.sleep(3000)
            check(exitCode == 0) { "Generator failed: $report" }
            val addedLog = logPath.readText().drop(logOffset)
            val slowStartup =
                addedLog.split(Regex("(?m)^\\d{4}-\\d{2}-\\d{2}")).any {
                    it.contains("Slow operations are prohibited on EDT") &&
                        it.contains("RunGeneratorManager")
                }
            check(!slowStartup) { "Generator process construction ran on the dispatch thread" }
        } finally {
            automationOutput().resolve("$label-startup.txt").writeText(report.toString())
        }
    }
}
