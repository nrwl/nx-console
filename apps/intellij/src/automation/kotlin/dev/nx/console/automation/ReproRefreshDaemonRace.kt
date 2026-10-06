package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.deleteIfExists
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes

@Remote("com.intellij.openapi.wm.impl.IdeFrameImpl")
interface RefreshRaceIdeFrame {
    fun setExtendedState(state: Int)

    fun toFront()

    fun getBalloonLayout(): RefreshRaceBalloonLayout
}

@Remote("com.intellij.ui.BalloonLayoutImpl")
interface RefreshRaceBalloonLayout {
    fun closeAll()
}

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface RefreshRaceLocalFileSystem {
    fun getInstance(): RefreshRaceLocalFileSystem

    fun refreshAndFindFileByPath(path: String): RefreshRaceVirtualFile?
}

@Remote("com.intellij.openapi.vfs.VirtualFile") interface RefreshRaceVirtualFile

private const val REFRESH_ACTION = "dev.nx.console.nxls.NxRefreshWorkspaceAction"
private const val DAEMON_START = "Starting new daemon server in background"
private const val DAEMON_REPLACED = "this process is no longer the current daemon"

private fun waitUntil(timeout: Duration, message: () -> String, condition: () -> Boolean) {
    val deadline = System.nanoTime() + timeout.inWholeNanoseconds
    while (!condition()) {
        check(System.nanoTime() < deadline, message)
        Thread.sleep(250)
    }
}

/** Only the log written after [offset], so earlier refreshes and startups are not counted. */
private fun logSince(log: Path, offset: Long): String =
    if (!log.exists()) ""
    else
        Files.readAllBytes(log)
            .let { it.copyOfRange(offset.toInt().coerceAtMost(it.size), it.size) }
            .decodeToString()

/** The `nx graph --watch` processes running from [workspace]'s own Nx installation. */
private fun graphProcessesIn(workspace: Path): List<String> =
    ProcessBuilder("ps", "-axo", "pid=,command=")
        .redirectErrorStream(true)
        .start()
        .inputStream
        .bufferedReader()
        .readLines()
        .map { it.trim() }
        .filter {
            it.contains("$workspace/node_modules/") &&
                it.contains(" graph --port ") &&
                it.contains("--watch")
        }

/**
 * Presses Nx Console's Refresh Workspace and checks that it does not start competing Nx daemons.
 *
 * A refresh stops the daemon, restarts nxls (which starts a daemon) and restarts the `nx graph
 * --watch` server (which needs one too). If the graph server starts before nxls has its daemon up,
 * both clients spawn a daemon, the older one exits because it is no longer the current daemon, and
 * a client still talking to it can mark the workspace daemon-disabled.
 */
fun main() = withAutomationDriver {
    val workspace = Path.of(System.getenv("NX_AUTOMATION_PROJECT")).toRealPath()
    val daemonDir = workspace.resolve(".nx/workspace-data/d")
    val daemonLog = daemonDir.resolve("daemon.log")
    val disabledMarker = daemonDir.resolve("disabled")

    waitForProjectOpen(2.minutes)
    withContext(OnDispatcher.EDT) {
        cast(ui.x("//div[@class='IdeFrameImpl']").component, RefreshRaceIdeFrame::class).apply {
            setExtendedState(0)
            toFront()
            getBalloonLayout().closeAll()
        }
    }
    // Disabled, and rejected, when no editor is open.
    runCatching {
        invokeAction("CloseAllEditors", component = ui.x("//div[@class='IdeFrameImpl']").component)
    }
    closeToolWindow("Project")
    openToolWindow("Nx Console")

    val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
    waitUntil(3.minutes, { "Nx Console never listed the fixture's projects." }) {
        runCatching {
                tree.expandAll()
                tree.collectExpandedPaths().any { it.path.lastOrNull() == "demo" }
            }
            .getOrDefault(false)
    }

    // Start from a healthy daemon, as in the report.
    disabledMarker.deleteIfExists()
    if (!daemonDir.resolve("server-process.json").exists()) {
        ProcessBuilder(workspace.resolve("node_modules/.bin/nx").toString(), "daemon", "--start")
            .directory(workspace.toFile())
            .inheritIO()
            .apply {
                environment().remove("CI")
                environment().remove("NX_DAEMON")
            }
            .start()
            .waitFor()
    }
    waitUntil(2.minutes, { "No Nx daemon is running in $workspace before the refresh." }) {
        daemonDir.resolve("server-process.json").exists()
    }
    Thread.sleep(5000)

    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "issue-3222-repro"
    recordIde(label) {
        val offset = if (daemonLog.exists()) Files.size(daemonLog) else 0L
        val graphBefore = graphProcessesIn(workspace).toSet()
        val frame = ui.x("//div[@class='IdeFrameImpl']").component
        invokeAction(REFRESH_ACTION, component = frame)

        // The issue reports the disabled marker about three seconds after the click. Wait for the
        // refresh to finish and then leave the daemons time to settle.
        waitUntil(2.minutes, { "The refresh never restarted the graph server." }) {
            (graphProcessesIn(workspace) - graphBefore).isNotEmpty()
        }
        Thread.sleep(15_000)

        val refreshLog = logSince(daemonLog, offset)
        val starts = refreshLog.lines().filter { it.contains(DAEMON_START) }
        val replaced = refreshLog.lines().filter { it.contains(DAEMON_REPLACED) }
        val epipe = refreshLog.lines().filter { it.contains("EPIPE") }
        val disabled = disabledMarker.exists()
        val graph = graphProcessesIn(workspace) - graphBefore

        val report = buildString {
            appendLine("label: $label")
            appendLine("workspace: $workspace")
            appendLine("daemon starts after refresh: ${starts.size}")
            starts.forEach { appendLine("  $it") }
            appendLine("daemons replaced by a newer one: ${replaced.size}")
            replaced.forEach { appendLine("  $it") }
            appendLine("EPIPE lines: ${epipe.size}")
            epipe.forEach { appendLine("  $it") }
            appendLine("disabled marker: $disabled")
            if (disabled) appendLine("  ${disabledMarker.readText().trim()}")
            appendLine("graph servers started by the refresh: $graph")
            appendLine("--- daemon.log since refresh ---")
            append(refreshLog)
        }
        val output =
            automationOutput()
                .resolve("refresh-daemon-race-${System.currentTimeMillis()}")
                .createDirectories()
        output.resolve("report.txt").writeText(report)
        println(report)

        // Diagnostic copy for the recording only: .nx is excluded from the IDE's file system, so
        // daemon.log itself cannot be opened in an editor. Written after all measurements.
        // A new file per run, so the editor cannot show a cached document from an earlier run.
        val reportName = "${output.fileName}.txt"
        workspace.resolve(reportName).writeText(report)
        checkNotNull(
            utility<RefreshRaceLocalFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(workspace.resolve(reportName).toString())
        ) {
            "The IDE cannot see the diagnostic report $reportName."
        }
        openFile(reportName)
        Thread.sleep(4000)

        check(graph.isNotEmpty()) { "The refresh did not restart the graph server." }
        check(!disabled) {
            "The refresh left the workspace daemon-disabled: ${disabledMarker.readText().trim()}"
        }
        check(replaced.isEmpty()) {
            "The refresh started competing daemons; ${replaced.size} exited as no longer current:\n" +
                starts.joinToString("\n")
        }
        check(starts.size == 1) {
            "Expected the refresh to start one daemon, but it started ${starts.size}:\n" +
                starts.joinToString("\n")
        }
        println("PASS: one daemon start, none replaced, no disabled marker")
    }
}
