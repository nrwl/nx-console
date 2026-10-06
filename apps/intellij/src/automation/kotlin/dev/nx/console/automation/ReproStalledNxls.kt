package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import java.util.Collections
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread
import kotlin.io.path.fileSize
import kotlin.io.path.writeText
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.nanoseconds
import kotlin.time.Duration.Companion.seconds

@Remote("dev.nx.console.nxls.NxlsService", plugin = "dev.nx.console")
interface StalledNxlsService {
    fun isStarted(): Boolean
}

@Remote("dev.nx.console.utils.sync_services.NxProjectJsonToProjectMap", plugin = "dev.nx.console")
interface StalledProjectJsonMap {
    fun init()
}

@Remote("com.intellij.openapi.wm.impl.IdeFrameImpl")
interface StalledIdeFrame {
    fun setExtendedState(state: Int)

    fun toFront()

    fun getBalloonLayout(): StalledBalloonLayout
}

@Remote("com.intellij.ui.BalloonLayoutImpl")
interface StalledBalloonLayout {
    fun closeAll()
}

@Remote("com.intellij.openapi.vfs.VirtualFile")
interface StalledVirtualFile {
    fun getPath(): String
}

@Remote("com.intellij.openapi.fileEditor.FileEditorManager")
interface StalledFileEditorManager {
    fun getSelectedFiles(): Array<StalledVirtualFile>
}

/** Opening this file sends its whole text to nxls in a didOpen. */
private const val CONFIG_FILE = "package.json"

/** Larger than a pipe buffer on macOS and Linux, so a single didOpen cannot fit into it. */
private const val MIN_CONFIG_FILE_BYTES = 128 * 1024L

/** How long nxls is kept from reading its stdin. */
private val STALL = 12.seconds

/** An EDT round trip above this is what the IDE itself reports as a freeze. */
private val MAX_EDT_ROUND_TRIP = 2.seconds

/** Frames that mean a thread is writing to, or waiting to write to, the nxls stdin pipe. */
private val PIPE_WRITE_FRAMES =
    listOf("java.io.FileOutputStream.writeBytes", "StreamMessageConsumer.consume")

private data class ProcessRow(val pid: Long, val ppid: Long, val command: String)

private fun processes(): List<ProcessRow> =
    ProcessBuilder("ps", "-axww", "-o", "pid=,ppid=,command=")
        .start()
        .inputStream
        .bufferedReader()
        .readLines()
        .mapNotNull { line ->
            val parts = line.trim().split(Regex("\\s+"), limit = 3)
            if (parts.size < 3) null else ProcessRow(parts[0].toLong(), parts[1].toLong(), parts[2])
        }

/**
 * The nxls process started by this worktree's automation IDE, identified through an ancestor's
 * `nx.console.automation.workspace` property so that no other IDE's language server is touched.
 */
private fun findNxls(workspace: String): Pair<ProcessRow, ProcessRow> {
    val rows = processes()
    val byPid = rows.associateBy { it.pid }
    fun ideOf(row: ProcessRow): ProcessRow? =
        generateSequence(byPid[row.ppid]) { byPid[it.ppid] }
            .take(5)
            .firstOrNull { it.command.contains("-Dnx.console.automation.workspace=$workspace ") }
    val matches =
        rows
            .filter { "nxls/main.js" in it.command }
            .mapNotNull { nxls -> ideOf(nxls)?.let { it to nxls } }
    return matches.singleOrNull()
        ?: error("Cannot identify one nxls process of the automation IDE for $workspace: $matches")
}

private fun signal(pid: Long, signal: String) {
    check(ProcessBuilder("kill", "-$signal", pid.toString()).start().waitFor() == 0) {
        "kill -$signal $pid failed"
    }
}

private fun threadDump(idePid: Long): List<String> {
    val jstack = Path.of(System.getProperty("java.home"), "bin", "jstack").toString()
    return ProcessBuilder(jstack, idePid.toString())
        .redirectErrorStream(true)
        .start()
        .inputStream
        .bufferedReader()
        .readText()
        .split("\n\n")
        .filter { it.startsWith("\"") }
}

private fun String.threadName() = substringAfter('"').substringBefore('"')

private fun Driver.edtRoundTrip(project: Project): Duration {
    val started = System.nanoTime()
    withContext(OnDispatcher.EDT) { service<StalledNxlsService>(project).isStarted() }
    return (System.nanoTime() - started).nanoseconds
}

/**
 * Pauses the automation IDE's own nxls with SIGSTOP, which is what a Node process busy booting or
 * recomputing the project graph looks like from the IDE: nothing drains its stdin pipe. While it is
 * paused, the scenario opens a package.json larger than the pipe buffer (didOpen, from the
 * EDT; #3234) and asks NxProjectJsonToProjectMap to reload (projectsByPaths, from
 * Dispatchers.Default; #3162). Neither the EDT nor a Dispatchers.Default worker may end up writing
 * to, or waiting for, the nxls pipe.
 */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val workspaceRoot = Path.of(project.getBasePath())
    val automationWorkspace = System.getProperty("nx.console.automation.workspace")
    val configFileBytes = workspaceRoot.resolve(CONFIG_FILE).fileSize()
    check(configFileBytes >= MIN_CONFIG_FILE_BYTES) {
        "$CONFIG_FILE is $configFileBytes bytes; pad it to at least $MIN_CONFIG_FILE_BYTES"
    }
    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, StalledIdeFrame::class).apply {
            setExtendedState(0)
            toFront()
            getBalloonLayout().closeAll()
        }
    }
    runCatching { invokeAction("CloseAllEditors", component = frame) }

    val nxlsService = service<StalledNxlsService>(project)
    val deadline = System.nanoTime() + 5.minutes.inWholeNanoseconds
    while (!withContext(OnDispatcher.EDT) { nxlsService.isStarted() }) {
        check(System.nanoTime() < deadline) { "nxls never reported itself as started" }
        Thread.sleep(250)
    }
    // Let the initial workspace load finish so the server is idle with an empty pipe.
    Thread.sleep(15_000)

    val (ide, nxls) = findNxls(automationWorkspace)
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "stalled-nxls"
    val report = StringBuilder()
    report.appendLine("#3234 / #3162: IDE threads while nxls is not reading its stdin")
    report.appendLine("Workspace: $workspaceRoot")
    report.appendLine("$CONFIG_FILE size: $configFileBytes bytes")
    report.appendLine("IDE pid ${ide.pid}, nxls pid ${nxls.pid}: ${nxls.command.take(200)}")

    val roundTrips = Collections.synchronizedList(mutableListOf<Pair<Duration, Duration>>())
    val probing = AtomicBoolean(true)
    val openError = AtomicReference<Throwable>()
    val reloadError = AtomicReference<Throwable>()
    var openTook: Duration? = null
    var dumpDuringStall = emptyList<String>()
    var selectedAfter: String? = null

    recordIde(label) {
        Thread.sleep(1500)
        val stallStarted = System.nanoTime()
        signal(nxls.pid, "STOP")
        try {
            val prober =
                thread(name = "edt-prober", isDaemon = true) {
                    withAutomationDriver {
                        while (probing.get()) {
                            val at = (System.nanoTime() - stallStarted).nanoseconds
                            roundTrips.add(at to edtRoundTrip(project))
                            Thread.sleep(250)
                        }
                    }
                }
            val opener =
                thread(name = "config-opener", isDaemon = true) {
                    try {
                        withAutomationDriver {
                            val started = System.nanoTime()
                            openFile(CONFIG_FILE)
                            openTook = (System.nanoTime() - started).nanoseconds
                        }
                    } catch (error: Throwable) {
                        openError.set(error)
                    }
                }
            Thread.sleep(1_500)
            // Launches populateMap() on the service's scope, which runs on Dispatchers.Default
            // and sends nx/projectsByPaths.
            try {
                service<StalledProjectJsonMap>(project).init()
            } catch (error: Throwable) {
                reloadError.set(error)
            }
            Thread.sleep(3_500)
            dumpDuringStall = threadDump(ide.pid)
            Thread.sleep((STALL - 5.seconds).inWholeMilliseconds)
            signal(nxls.pid, "CONT")
            report.appendLine(
                "nxls resumed after ${(System.nanoTime() - stallStarted).nanoseconds.inWholeMilliseconds}ms"
            )
            opener.join(60_000)
            Thread.sleep(3_000)
            probing.set(false)
            prober.join(60_000)
            selectedAfter =
                withContext(OnDispatcher.EDT) {
                    service<StalledFileEditorManager>(project)
                        .getSelectedFiles()
                        .firstOrNull()
                        ?.getPath()
                }
            Thread.sleep(1500)
        } finally {
            signal(nxls.pid, "CONT")
        }
    }

    val pipeThreads = dumpDuringStall.filter { stack -> PIPE_WRITE_FRAMES.any { it in stack } }
    val edtInPipe = pipeThreads.filter { it.threadName().startsWith("AWT-EventQueue") }
    val defaultInPipe =
        pipeThreads.filter { it.threadName().startsWith("DefaultDispatcher-worker") }
    val trips = roundTrips.toList()
    val worst = trips.maxByOrNull { it.second }
    report.appendLine("openFile($CONFIG_FILE) returned after: ${openTook?.inWholeMilliseconds}ms")
    openError.get()?.let { report.appendLine("openFile failed: $it") }
    reloadError.get()?.let { report.appendLine("NxProjectJsonToProjectMap.init failed: $it") }
    report.appendLine("Selected file afterwards: $selectedAfter")
    report.appendLine("EDT round trips: ${trips.size}")
    trips.forEach { (at, took) ->
        report.appendLine("  at +${at.inWholeMilliseconds}ms took ${took.inWholeMilliseconds}ms")
    }
    report.appendLine("Worst EDT round trip: ${worst?.second?.inWholeMilliseconds}ms")
    report.appendLine()
    report.appendLine("Threads in the nxls pipe writer 5s into the stall: ${pipeThreads.size}")
    report.appendLine("  EDT: ${edtInPipe.size}, Dispatchers.Default: ${defaultInPipe.size}")
    pipeThreads.forEach { report.appendLine().appendLine(it.lines().take(40).joinToString("\n")) }
    println(report)
    automationOutput()
        .resolve("$label-${System.currentTimeMillis()}.txt")
        .writeText(report.toString())
    runCatching { invokeAction("CloseAllEditors", component = frame) }

    val failures = buildList {
        if (worst == null) add("No EDT round trip completed")
        else if (worst.second >= MAX_EDT_ROUND_TRIP)
            add("The EDT was blocked for ${worst.second.inWholeMilliseconds}ms")
        if (edtInPipe.isNotEmpty()) add("The EDT was writing to the nxls pipe during the stall")
        if (defaultInPipe.isNotEmpty())
            add(
                "${defaultInPipe.size} Dispatchers.Default worker(s) were writing to the nxls pipe: " +
                    defaultInPipe.joinToString { it.threadName() }
            )
        if (openError.get() != null) add("openFile failed: ${openError.get()}")
        if (reloadError.get() != null)
            add("NxProjectJsonToProjectMap.init failed: ${reloadError.get()}")
        if (selectedAfter?.endsWith("/$CONFIG_FILE") != true)
            add("$CONFIG_FILE was not the selected editor afterwards")
    }
    check(failures.isEmpty()) { failures.joinToString("\n") + "\n\n$report" }
    println("PASS: EDT and Dispatchers.Default stayed off the stalled nxls pipe")
}
