package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.waitForProjectOpen
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread
import kotlin.io.path.writeText
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.nanoseconds
import kotlin.time.Duration.Companion.seconds

@Remote("dev.nx.console.nxls.NxlsService", plugin = "dev.nx.console")
interface EditorFreezeNxlsService {
    fun isStarted(): Boolean
}

@Remote("java.lang.Thread")
interface NxlsFreezeControl {
    fun sleep(millis: Long)
}

private val MAX_EDT_ROUND_TRIP = 2.seconds

private fun Driver.edtRoundTrip(project: Project): Duration {
    val started = System.nanoTime()
    withContext(OnDispatcher.EDT) { service<EditorFreezeNxlsService>(project).isStarted() }
    return (System.nanoTime() - started).nanoseconds
}

private fun Driver.withEdtHeartbeat(
    project: Project,
    report: StringBuilder,
    operations: () -> Unit,
) {
    val running = AtomicBoolean(true)
    val ready = CountDownLatch(1)
    val failure = AtomicReference<Throwable>()
    val latencies = ConcurrentLinkedQueue<Duration>()
    val heartbeat =
        thread(name = "nxls-edt-heartbeat", isDaemon = true) {
            try {
                // Use a separate JMX connection so a blocking operation cannot serialize the
                // probes.
                withAutomationDriver {
                    while (running.get()) {
                        latencies.add(edtRoundTrip(project))
                        ready.countDown()
                        Thread.sleep(50)
                    }
                }
            } catch (error: Throwable) {
                failure.set(error)
                ready.countDown()
            }
        }
    try {
        check(ready.await(30, TimeUnit.SECONDS)) { "EDT heartbeat did not start" }
        failure.get()?.let { throw it }
        operations()
    } finally {
        running.set(false)
        heartbeat.join(30_000)
        check(!heartbeat.isAlive) { "EDT heartbeat did not finish" }
        failure.get()?.let { throw it }
        val worst = checkNotNull(latencies.maxOrNull()) { "No EDT heartbeat samples" }
        report.appendLine(
            "EDT heartbeat: ${latencies.size} samples, worst=$worst (limit=$MAX_EDT_ROUND_TRIP)"
        )
        check(worst < MAX_EDT_ROUND_TRIP) {
            "The EDT was blocked for $worst during editor operations\n$report"
        }
    }
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val frame = nxlsFrame()
    nxlsRunning(project)
    if (service<NxlsEditors>(project).getOpenFiles().isNotEmpty()) {
        invokeAction("CloseAllEditors", component = frame)
    }
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "editor-freeze"
    val report = StringBuilder("Nx Console editor freeze scenario\n")
    val originals = mutableMapOf<NxlsEditor, String>()
    val autoSave = service<NxlsAutoSave>().disableAutoSave()
    recordIde(label) {
        try {
            withEdtHeartbeat(project, report) {
                for (path in listOf("nx.json", "package.json")) {
                    openFile(path)
                    val editor = nxlsEditor(project)
                    check(!service<NxlsDocuments>().isDocumentUnsaved(editor.getDocument())) {
                        "Save $path before running"
                    }
                    originals[editor] = nxlsText(editor)
                    if (System.getenv("NX_AUTOMATION_FAULT") == "edt-freeze") {
                        withContext(OnDispatcher.EDT) { utility<NxlsFreezeControl>().sleep(3_000) }
                    }
                    val file = checkNotNull(service<NxlsDocuments>().getFile(editor.getDocument()))
                    val server = nxlsPlatformClient(project)
                    nxlsWait(message = { "$path was never opened by platform LSP" }) {
                        server
                            .`getDocumentSyncManager$intellij_platform_lsp_impl`()
                            .isFileOpened(file)
                    }
                    nxlsDocumentFault(server, file, originals.getValue(editor))
                    nxlsAssertTracked(server, listOf(file))
                    report.appendLine("$path: platform LSP tracks the document")
                }
                openFile("nx.json")
                val editor = nxlsEditor(project)
                nxlsFocusEditor(editor)
                repeat(10) { invokeAction("EditorEnter", component = editor.getContentComponent()) }
                repeat(10) {
                    invokeAction("EditorBackSpace", component = editor.getContentComponent())
                }
                nxlsAssertTracked(
                    nxlsPlatformClient(project),
                    originals.keys.map {
                        checkNotNull(service<NxlsDocuments>().getFile(it.getDocument()))
                    },
                )
                for ((opened, original) in originals) {
                    nxlsReplace(opened, original, 0)
                    withWriteAction { service<NxlsDocuments>().saveDocument(opened.getDocument()) }
                }
                val files =
                    originals.keys.map {
                        checkNotNull(service<NxlsDocuments>().getFile(it.getDocument()))
                    }
                invokeAction("CloseAllEditors", component = frame)
                nxlsWait(message = { "Platform LSP still tracks closed documents" }) {
                    files.none {
                        nxlsPlatformClient(project)
                            .`getDocumentSyncManager$intellij_platform_lsp_impl`()
                            .isFileOpened(it)
                    }
                }
                report.appendLine("Typing and closing: platform document lifecycle verified")
            }
        } finally {
            for ((editor, original) in originals) {
                if (!editor.isDisposed()) nxlsReplace(editor, original, 0)
                withWriteAction { service<NxlsDocuments>().saveDocument(editor.getDocument()) }
            }
            autoSave.finish()
            automationOutput()
                .resolve("$label-${System.currentTimeMillis()}.txt")
                .writeText(report.toString())
        }
    }
}
