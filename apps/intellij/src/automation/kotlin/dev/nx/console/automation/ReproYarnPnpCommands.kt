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
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.net.HttpURLConnection
import java.net.URI
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.deleteIfExists
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("StandardNxGraphServer", plugin = "dev.nx.console")
interface PnpCommandsGraphServer {
    fun start()

    fun getCurrentPort(): Int?

    fun dispose()
}

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface PnpCommandsFileSystem {
    fun getInstance(): PnpCommandsFileSystem

    fun refreshAndFindFileByPath(path: String): VirtualFile?
}

@Remote("com.intellij.xdebugger.XDebuggerUtil")
interface PnpCommandsDebuggerUtil {
    fun getInstance(): PnpCommandsDebuggerUtil

    fun toggleLineBreakpoint(project: Project, file: VirtualFile, line: Int)
}

@Remote("com.intellij.xdebugger.XDebuggerManager")
interface PnpCommandsDebuggerManager {
    fun getCurrentSession(): PnpCommandsDebugSession?
}

@Remote("com.intellij.xdebugger.XDebugSession")
interface PnpCommandsDebugSession {
    fun isSuspended(): Boolean

    fun getCurrentPosition(): PnpCommandsSourcePosition?

    fun resume()
}

@Remote("com.intellij.xdebugger.XSourcePosition")
interface PnpCommandsSourcePosition {
    fun getLine(): Int
}

@Remote("com.intellij.openapi.wm.impl.IdeFrameImpl")
interface PnpCommandsIdeFrame {
    fun setExtendedState(state: Int)

    fun toFront()

    fun getBalloonLayout(): PnpCommandsBalloonLayout
}

@Remote("com.intellij.ui.BalloonLayoutImpl")
interface PnpCommandsBalloonLayout {
    fun closeAll()
}

@Remote("javax.swing.JTree")
interface PnpCommandsTree {
    fun setSelectionRow(row: Int)

    fun scrollRowToVisible(row: Int)
}

@Remote("com.intellij.openapi.actionSystem.AnAction")
interface PnpCommandsAction {
    fun getTemplateText(): String?
}

@Remote("com.intellij.openapi.actionSystem.ex.ActionUtil")
interface PnpCommandsActionUtil {
    fun getActions(component: Component): List<PnpCommandsAction>
}

private const val MARKER = "apps/demo/pnp-run-marker.txt"
private const val DEBUG_SCRIPT = "apps/demo/hello-debug.js"
private const val DEBUG_MARKER = "apps/demo/pnp-debug-marker.txt"
// 0-based: the line before the script writes its marker.
private const val DEBUG_LINE = 1

// ProcessHandle does not expose other processes' arguments on macOS.
private fun graphProcesses(port: Int): List<String> =
    ProcessBuilder("ps", "-axo", "pid=,command=")
        .start()
        .inputStream
        .bufferedReader()
        .readLines()
        .map { it.trim() }
        .filter { it.contains(" graph ") && it.contains("--port $port ") }

private fun waitFor(timeout: Duration, condition: () -> Boolean): Boolean {
    val deadline = System.nanoTime() + timeout.inWholeNanoseconds
    while (System.nanoTime() < deadline) {
        if (runCatching(condition).getOrDefault(false)) return true
        Thread.sleep(500)
    }
    return false
}

private fun httpStatus(port: Int): Int? =
    runCatching {
            (URI("http://127.0.0.1:$port/").toURL().openConnection() as HttpURLConnection).run {
                connectTimeout = 2000
                readTimeout = 5000
                responseCode.also { disconnect() }
            }
        }
        .getOrNull()

/**
 * In a Yarn PnP workspace, runs `demo:hello` from the Nx Console tree (a run configuration), debugs
 * `demo:debug-me` with a breakpoint in the script it runs, and starts the project graph server (the
 * command line that generators also use). Both must start the workspace's Nx: the target writes a
 * marker file and the graph server must answer HTTP requests. Stopping the graph server must not
 * leave its nx process running.
 */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val workspace = Path.of(project.getBasePath())
    check(workspace.resolve(".pnp.cjs").exists()) { "$workspace is not a Yarn PnP workspace" }
    val marker = workspace.resolve(MARKER)
    marker.deleteIfExists()

    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, PnpCommandsIdeFrame::class).apply {
            setExtendedState(0)
            toFront()
            getBalloonLayout().closeAll()
        }
    }
    runCatching { invokeAction("CloseAllEditors", component = frame) }
    runCatching { closeToolWindow("Run") }
    closeToolWindow("Project")
    openToolWindow("Nx Console")

    val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
    check(
        waitFor(3.minutes) {
            tree.expandAll()
            tree.findExpandedPath("Projects", "demo", "hello", fullMatch = true) != null
        }
    ) {
        "Nx Console never listed demo:hello: ${tree.collectExpandedPaths()}"
    }

    val report = StringBuilder()
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "yarn-pnp-commands"
    var targetRan = false
    var graphPort: Int? = null
    var graphStatus: Int? = null
    var servingGraphProcesses: List<String> = emptyList()
    var leftoverGraphProcesses: List<String> = emptyList()

    fun executeTreeAction(target: String, actionText: String) {
        val action =
            withContext(OnDispatcher.EDT) {
                val row =
                    checkNotNull(
                            tree.findExpandedPath("Projects", "demo", target, fullMatch = true)
                        )
                        .row
                cast(tree.component, PnpCommandsTree::class).apply {
                    setSelectionRow(row)
                    scrollRowToVisible(row)
                }
                utility<PnpCommandsActionUtil>().getActions(tree.component).single {
                    it.getTemplateText() == actionText
                }
            }
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
    }

    val debugMarker = workspace.resolve(DEBUG_MARKER)
    debugMarker.deleteIfExists()
    val debugScript =
        checkNotNull(
            utility<PnpCommandsFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(workspace.resolve(DEBUG_SCRIPT).toString())
        )
    var suspendedLine: Int? = null
    var markerWhileSuspended = false
    var debugTargetFinished = false

    recordIde(label) {
        Thread.sleep(1500)
        executeTreeAction("hello", "Run")
        targetRan = waitFor(90.seconds) { marker.exists() }
        report.appendLine("demo:hello wrote $MARKER: $targetRan")
        if (targetRan) report.appendLine("  ${marker.readText().trim()}")
        Thread.sleep(3000)

        withContext(OnDispatcher.EDT, LockSemantics.WRITE_ACTION) {
            utility<PnpCommandsDebuggerUtil>()
                .getInstance()
                .toggleLineBreakpoint(project, debugScript, DEBUG_LINE)
        }
        executeTreeAction("debug-me", "Debug")
        val debugger = service<PnpCommandsDebuggerManager>(project)
        waitFor(90.seconds) { debugger.getCurrentSession()?.isSuspended() == true }
        val session = debugger.getCurrentSession()
        suspendedLine = session?.takeIf { it.isSuspended() }?.getCurrentPosition()?.getLine()
        markerWhileSuspended = debugMarker.exists()
        report.appendLine(
            "debug-me suspended at 0-based line $suspendedLine of $DEBUG_SCRIPT; " +
                "marker already written: $markerWhileSuspended"
        )
        Thread.sleep(3000)
        if (suspendedLine != null) session?.resume()
        debugTargetFinished = waitFor(60.seconds) { debugMarker.exists() }
        report.appendLine("debug-me wrote $DEBUG_MARKER after resuming: $debugTargetFinished")
        withContext(OnDispatcher.EDT, LockSemantics.WRITE_ACTION) {
            utility<PnpCommandsDebuggerUtil>()
                .getInstance()
                .toggleLineBreakpoint(project, debugScript, DEBUG_LINE)
        }
        Thread.sleep(3000)

        val graph = service<PnpCommandsGraphServer>(project)
        graph.start()
        waitFor(90.seconds) {
            graphPort = graph.getCurrentPort()
            graphStatus = graphPort?.let(::httpStatus)
            graphStatus == 200
        }
        report.appendLine("graph server port: $graphPort, HTTP status: $graphStatus")
        graphPort?.let { port ->
            servingGraphProcesses = graphProcesses(port)
            report.appendLine("graph processes while serving:")
            servingGraphProcesses.forEach { report.appendLine("  $it") }
            Thread.sleep(3000)
            graph.dispose()
            waitFor(15.seconds) { graphProcesses(port).isEmpty() }
            leftoverGraphProcesses = graphProcesses(port)
            report.appendLine("graph processes after dispose: $leftoverGraphProcesses")
        }
    }

    println(report)
    automationOutput()
        .resolve("$label-${System.currentTimeMillis()}")
        .createDirectories()
        .resolve("report.txt")
        .writeText(report.toString())

    val failures = buildList {
        if (!targetRan) add("Running demo:hello from Nx Console did not run the target")
        if (suspendedLine != DEBUG_LINE || markerWhileSuspended) {
            add("Debugging debug-me did not stop at the breakpoint (line $suspendedLine)")
        }
        if (!debugTargetFinished) add("debug-me did not finish after resuming the debugger")
        if (graphStatus != 200) add("The Nx graph server did not serve on port $graphPort")
        if (servingGraphProcesses.isEmpty()) add("Could not find the graph server's processes")
        if (leftoverGraphProcesses.isNotEmpty()) {
            add("Stopping the graph server left $leftoverGraphProcesses running")
        }
    }
    check(failures.isEmpty()) { failures.joinToString("\n") }
    println(
        "PASS: target ran, debugger stopped at the breakpoint, graph server served and stopped under Yarn PnP"
    )
}
