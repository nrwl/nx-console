package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.LockSemantics
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.ActionManager
import com.intellij.driver.sdk.AnAction
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.VirtualFile
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.deleteIfExists
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("dev.nx.console.run.GetOrCreateRunnerAndConfigurationSettingsKt", plugin = "dev.nx.console")
interface RunArgumentsConfigurations {
    fun getOrCreateRunnerConfigurationSettings(
        project: Project,
        nxProject: String,
        nxTarget: String,
        nxTargetConfiguration: String,
        args: List<String>,
    ): SavedRunConfiguration
}

@Remote("com.intellij.execution.RunnerAndConfigurationSettings")
interface SavedRunConfiguration {
    fun getConfiguration(): NxRunConfigurationRef
}

@Remote("dev.nx.console.run.NxCommandConfiguration", plugin = "dev.nx.console")
interface NxRunConfigurationRef {
    fun getNxRunSettings(): NxRunArgumentsRef
}

@Remote("dev.nx.console.run.NxRunSettings", plugin = "dev.nx.console")
interface NxRunArgumentsRef {
    fun getArguments(): String
}

@Remote("com.intellij.execution.RunManager")
interface SavedRunManager {
    fun addConfiguration(settings: SavedRunConfiguration)

    fun setSelectedConfiguration(settings: SavedRunConfiguration)
}

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface RunArgumentsFileSystem {
    fun getInstance(): RunArgumentsFileSystem

    fun refreshAndFindFileByPath(path: String): VirtualFile?
}

@Remote("javax.swing.JTree")
interface RunArgumentsTree {
    fun setSelectionRow(row: Int)

    fun scrollRowToVisible(row: Int)
}

@Remote("com.intellij.openapi.actionSystem.AnAction")
interface RunArgumentsAction {
    fun getTemplateText(): String?
}

@Remote("com.intellij.openapi.actionSystem.ex.ActionUtil")
interface RunArgumentsActionUtil {
    fun getActions(component: Component): List<RunArgumentsAction>
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val workspace = Path.of(project.getBasePath())
    check(workspace.fileName.toString() == "intellij-automation-fixture")
    val receivedArgs = workspace.resolve(".nx/automation-args.json")
    receivedArgs.deleteIfExists()
    val expectedArguments = "--greeting=\"hello from Nx Console\""
    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, GraphIdeFrame::class).apply {
            setExtendedState(0)
            toFront()
            getBalloonLayout().closeAll()
        }
    }
    runCatching { invokeAction("CloseAllEditors", component = frame) }
    runCatching { closeToolWindow("Run") }
    closeToolWindow("Project")
    openToolWindow("Nx Console")
    val saved =
        withContext(OnDispatcher.EDT) {
            utility<RunArgumentsConfigurations>()
                .getOrCreateRunnerConfigurationSettings(
                    project,
                    "demo",
                    "hello",
                    "",
                    listOf("demo:hello", expectedArguments),
                )
                .also {
                    service<SavedRunManager>(project).addConfiguration(it)
                    service<SavedRunManager>(project).setSelectedConfiguration(it)
                }
        }
    val before = saved.getConfiguration().getNxRunSettings().getArguments()
    check(before == expectedArguments)
    val evidence = workspace.resolve("demo/run-arguments-repro.txt")
    evidence.writeText(
        "Issue #3191: saved run arguments\n\nTarget: demo:hello\nSaved arguments: $before\n\nRun hello from the Nx Console tree.\nExpected target arguments: --greeting=hello from Nx Console\n"
    )
    checkNotNull(
        utility<RunArgumentsFileSystem>()
            .getInstance()
            .refreshAndFindFileByPath(evidence.toString())
    )
    openFile("demo/run-arguments-repro.txt")
    val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
    tree.expandAll()
    println("Nx Console tree: ${tree.collectExpandedPaths()}")
    inspectIde()
    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "issue-3191-repro") {
        Thread.sleep(2000)
        val action =
            withContext(OnDispatcher.EDT) {
                val row =
                    checkNotNull(
                            tree.findExpandedPath("Projects", "demo", "hello", fullMatch = true)
                        )
                        .row
                cast(tree.component, RunArgumentsTree::class).apply {
                    setSelectionRow(row)
                    scrollRowToVisible(row)
                }
                val actions = utility<RunArgumentsActionUtil>().getActions(tree.component)
                println("Tree actions: ${actions.map { it.getTemplateText() }}")
                actions.single { it.getTemplateText() == "Run" }
            }
        val callback =
            withContext(OnDispatcher.EDT, LockSemantics.READ_ACTION) {
                service<ActionManager>()
                    .tryToExecute(
                        cast(action, AnAction::class),
                        null,
                        tree.component,
                        "NxToolWindow",
                        true,
                    )
            }
        check(!callback.isRejected()) { "Tree Run action rejected: ${callback.getError()}" }
        val deadline = System.nanoTime() + 60.seconds.inWholeNanoseconds
        while (!receivedArgs.exists() && System.nanoTime() < deadline) Thread.sleep(250)
        val after = saved.getConfiguration().getNxRunSettings().getArguments()
        val received = if (receivedArgs.exists()) receivedArgs.readText() else "No task output"
        val report =
            "Issue #3191: tree Run result\n\nSaved before launch: $before\nSaved after launch: ${after.ifEmpty { "<empty>" }}\nTarget received: $received\n"
        println(report)
        automationOutput()
            .resolve("run-arguments-${System.currentTimeMillis()}.txt")
            .writeText(report)
        val resultFile = workspace.resolve("demo/run-arguments-result.txt")
        resultFile.writeText(report)
        checkNotNull(
            utility<RunArgumentsFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(resultFile.toString())
        )
        openFile("demo/run-arguments-result.txt")
        Thread.sleep(5000)
        check(receivedArgs.exists()) { "The Nx target did not produce its output" }
        check(after == expectedArguments) {
            "Launching the tree target erased saved arguments: $report"
        }
        check(received.contains("--greeting=hello from Nx Console")) {
            "The target did not receive the saved argument: $report"
        }
    }
}
