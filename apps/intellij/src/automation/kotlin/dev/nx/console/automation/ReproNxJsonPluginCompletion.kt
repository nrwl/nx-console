package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.FileEditorManager
import com.intellij.driver.sdk.VirtualFile
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface PluginCompletionFileSystem {
    fun getInstance(): PluginCompletionFileSystem

    fun refreshAndFindFileByPath(path: String): VirtualFile?
}

private val expectedPlugins = listOf("@nx/eslint/plugin", "@nx/vite/plugin")

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val workspace = Path.of(project.getBasePath())
    check(workspace.fileName.toString() == "nx24-plugin-completion-fixture")
    val nxVersion = workspace.resolve("node_modules/nx/package.json").readText()
    val installedNx = Regex("\"version\":\\s*\"([^\"]+)\"").find(nxVersion)?.groupValues?.get(1)
    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, GraphIdeFrame::class).apply {
            setExtendedState(0)
            getBalloonLayout().closeAll()
        }
    }
    runCatching { invokeAction("CloseAllEditors", component = frame) }
    closeToolWindow("Project")

    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "nx-json-plugin-completion-repro") {
        openFile("nx.json")
        val (file, editor) =
            withContext(OnDispatcher.EDT) {
                val editors = service<FileEditorManager>(project)
                checkNotNull(editors.getCurrentFile()) to
                    checkNotNull(editors.getSelectedTextEditor())
            }
        val text = editor.getDocument().getText()
        val marker = "\"plugin\": \""
        val offset = text.indexOf(marker) + marker.length
        check(offset > marker.length) { "nx.json has no plugin entry" }
        withContext(OnDispatcher.EDT) { editor.getCaretModel().moveToOffset(offset) }
        Thread.sleep(2000)

        // Completion is requested through the IDE's LSP client for the open, synced nx.json, then
        // shown in the lookup popup.
        fun completionLabels(at: Int): List<String> {
            val server = nxlsPlatformClient(project)
            return withReadAction {
                    server.getRequestExecutor().getCompletionList(file, at, true)?.getItems()?.map {
                        it.getLabel()
                    }
                }
                .orEmpty()
        }

        var labels: List<String> = emptyList()
        var error: Throwable? = null
        val deadline = System.nanoTime() + 90.seconds.inWholeNanoseconds
        // Requests can fail while nxls starts. Once it answers, allow a short grace period for the
        // workspace to load, then stop so a failing build does not idle for the whole timeout.
        val answeredGrace = 15.seconds.inWholeNanoseconds
        var answeredAt: Long? = null
        while (System.nanoTime() < deadline) {
            runCatching { completionLabels(offset) }
                .onSuccess {
                    labels = it
                    error = null
                    answeredAt = answeredAt ?: System.nanoTime()
                }
                .onFailure { error = it }
            if (expectedPlugins.all { it in labels }) break
            if (answeredAt?.let { System.nanoTime() - it > answeredGrace } == true) break
            Thread.sleep(2000)
        }
        val pluginLabels = labels.filter { it.endsWith("/plugin") }

        // The lookup is an editor hint, which the platform only shows while the IDE is the active
        // application, so this step brings the IDE to the front.
        val lookupEditor = nxlsEditor(project)
        withContext(OnDispatcher.EDT) { lookupEditor.getCaretModel().moveToOffset(offset) }
        nxlsHideLookup(project)
        nxlsFocusEditor(lookupEditor)
        invokeAction("CodeCompletion", component = lookupEditor.getContentComponent())
        var popupLabels: List<String>? = null
        runCatching {
            nxlsWait(20.seconds, { "No completion popup" }) {
                withContext(OnDispatcher.EDT) {
                    val lookup = service<NxlsLookups>(project).getActiveLookup()
                    if (lookup == null || lookup.isCalculating()) return@withContext false
                    popupLabels = lookup.getItems().map { it.getLookupString() }
                    true
                }
            }
        }
        // The platform closes the lookup when the IDE loses focus, so the popup only counts if it
        // stays on screen for the whole hold.
        var popupHeld = popupLabels != null
        val holdUntil = System.nanoTime() + 5.seconds.inWholeNanoseconds
        while (popupHeld && System.nanoTime() < holdUntil) {
            popupHeld =
                withContext(OnDispatcher.EDT) {
                    service<NxlsLookups>(project).getActiveLookup() != null
                }
            Thread.sleep(250)
        }
        if (popupLabels == null) Thread.sleep(5000)
        nxlsHideLookup(project)
        val popupPlugins =
            if (popupHeld) popupLabels.orEmpty().filter { it.contains("/plugin") } else emptyList()

        // Control: a root key position in the same document, answered from the nx.json schema
        val keyOffset = text.indexOf("\"analytics\"") + 1
        val keyLabels =
            runCatching { completionLabels(keyOffset) }.getOrElse { listOf("error: $it") }
        val passed =
            expectedPlugins.all { expected ->
                expected in labels && popupPlugins.any { it.contains(expected) }
            }
        val report =
            "nx.json \"plugin\" completion through the IDE's Nx language server client\n\n" +
                "Nx installed in the workspace: $installedNx\n" +
                "Expected (installed Nx plugins with a ./plugin export): $expectedPlugins\n" +
                "Completion items: ${labels.size}\n" +
                "Plugin items: $pluginLabels\n" +
                "Completion popup: ${popupLabels?.let { "${it.size} items, plugins ${it.filter { label -> label.contains("/plugin") }}" } ?: "not shown"}${if (popupLabels != null && !popupHeld) " (closed early, IDE lost focus)" else ""}\n" +
                (error?.let { "Last request error: $it\n" } ?: "") +
                "Control, root key completion in the same file: ${keyLabels.size} items\n" +
                "\nRESULT: ${if (passed) "PASS" else "FAIL"}\n"
        println(report)
        automationOutput()
            .resolve("nx-json-plugin-completion-${System.currentTimeMillis()}.txt")
            .writeText(report)
        val resultFile = workspace.resolve("plugin-completion-result.txt")
        resultFile.writeText(report)
        checkNotNull(
            utility<PluginCompletionFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(resultFile.toString())
        )
        openFile("plugin-completion-result.txt")
        Thread.sleep(5000)
        check(passed) { "nx.json plugin completion is missing installed plugins:\n$report" }
    }
}
