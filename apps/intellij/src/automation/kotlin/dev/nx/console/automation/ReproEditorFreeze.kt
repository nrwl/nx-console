package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import kotlin.io.path.writeText
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.nanoseconds
import kotlin.time.Duration.Companion.seconds

@Remote("dev.nx.console.nxls.NxlsService", plugin = "dev.nx.console")
interface EditorFreezeNxlsService {
    fun isStarted(): Boolean

    fun isEditorConnected(editor: EditorFreezeEditor): Boolean
}

@Remote("com.intellij.openapi.editor.Editor") interface EditorFreezeEditor

@Remote("com.intellij.openapi.fileEditor.FileEditorManager")
interface EditorFreezeFileEditorManager {
    fun getSelectedTextEditor(): EditorFreezeEditor?
}

/**
 * Files that make [dev.nx.console.listeners.NxEditorListener] talk to nxls when they are opened.
 */
private val NX_CONFIG_FILES = listOf("nx.json", "package.json")

/**
 * The longest an EDT round trip may take. Anything above this is what the IDE itself would count as
 * a freeze, and what JetBrains' Marketplace freeze reports record.
 */
private val MAX_EDT_ROUND_TRIP = 2.seconds

private fun waitUntil(timeout: Duration, message: () -> String, condition: () -> Boolean) {
    val deadline = System.nanoTime() + timeout.inWholeNanoseconds
    while (!condition()) {
        check(System.nanoTime() < deadline, message)
        Thread.sleep(250)
    }
}

/**
 * Times a trivial piece of work on the EDT.
 *
 * Every LSP notification Nx Console sends for an open config file used to be written into the nxls
 * stdin pipe on the EDT, so a server that was busy starting up or recomputing the project graph
 * would park the UI thread inside that write. Measuring a round trip is how that shows up here.
 */
private fun Driver.edtRoundTrip(project: Project): Duration {
    val started = System.nanoTime()
    withContext(OnDispatcher.EDT) { service<EditorFreezeNxlsService>(project).isStarted() }
    return (System.nanoTime() - started).nanoseconds
}

private fun Driver.selectedEditor(project: Project): EditorFreezeEditor =
    withContext(OnDispatcher.EDT) {
        checkNotNull(service<EditorFreezeFileEditorManager>(project).getSelectedTextEditor()) {
            "No editor is selected"
        }
    }

private fun Driver.prepareFrame(): Component {
    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, GraphIdeFrame::class).apply {
            setExtendedState(0)
            toFront()
            getBalloonLayout().closeAll()
        }
    }
    runCatching { invokeAction("CloseAllEditors", component = frame) }
    runCatching { closeToolWindow("Project") }
    return frame
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val frame = prepareFrame()
    val nxls = service<EditorFreezeNxlsService>(project)

    waitUntil(5.minutes, { "nxls never reported itself as started" }) {
        withContext(OnDispatcher.EDT) { nxls.isStarted() }
    }

    val report = StringBuilder()
    report.appendLine("Nx Console editor freeze scenario")
    report.appendLine("Workspace: ${project.getBasePath()}")
    report.appendLine()

    val latencies = mutableMapOf<String, Duration>()

    for (path in NX_CONFIG_FILES) {
        openFile(path)
        val editor = selectedEditor(project)

        latencies["open $path"] = edtRoundTrip(project)

        waitUntil(60.seconds, { "nxls never took ownership of $path" }) {
            withContext(OnDispatcher.EDT) { nxls.isEditorConnected(editor) }
        }
        report.appendLine("$path: connected to nxls, EDT round trip ${latencies["open $path"]}")
    }

    // Every keystroke in a tracked file produces a didChange, which is the same transport.
    openFile(NX_CONFIG_FILES.first())
    val typedIn = selectedEditor(project)
    repeat(10) { invokeAction("EditorEnter", component = frame) }
    latencies["typing"] = edtRoundTrip(project)
    report.appendLine("after 10 keystrokes: EDT round trip ${latencies["typing"]}")
    repeat(10) { invokeAction("EditorBackSpace", component = frame) }

    check(
        withContext(OnDispatcher.EDT) { nxls.isEditorConnected(typedIn) },
        { "The edited file stopped being tracked by nxls" },
    )

    invokeAction("CloseAllEditors", component = frame)
    latencies["close"] = edtRoundTrip(project)
    report.appendLine("after closing every editor: EDT round trip ${latencies["close"]}")

    val worst = latencies.maxBy { it.value }
    report.appendLine()
    report.appendLine("Worst EDT round trip: ${worst.value} during '${worst.key}'")
    println(report)
    automationOutput()
        .resolve("editor-freeze-${System.currentTimeMillis()}.txt")
        .writeText(report.toString())

    check(worst.value < MAX_EDT_ROUND_TRIP) {
        "The EDT was blocked for ${worst.value} during '${worst.key}'\n\n$report"
    }
}
