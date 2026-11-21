package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.VirtualFile
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.isDirectory
import kotlin.io.path.listDirectoryEntries
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface PluginCompletionFileSystem {
    fun getInstance(): PluginCompletionFileSystem

    fun refreshAndFindFileByPath(path: String): VirtualFile?
}

private val expectedPlugins =
    listOf("@nx/eslint/plugin", "@nx/vite/plugin", "@nx/vitest", "@nx/js/typescript")

private const val builtInPlugin = "nx/src/plugins/js"

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val workspace = Path.of(project.getBasePath())
    check(workspace.fileName.toString() == "nx24-plugin-completion-fixture")
    nxlsFrame()
    nxlsRunning(project)
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "nx-json-plugin-completion"
    val report =
        StringBuilder(
            "IDE ${getProductVersion()}\nExpected in both forms: $expectedPlugins\nExcluded from both lookups: $builtInPlugin\n"
        )
    val failures = mutableListOf<String>()
    val autoSave = service<NxlsAutoSave>().disableAutoSave()
    try {
        recordIde(label) {
            openFile("nx.json")
            val editor = nxlsEditor(project)
            val original = nxlsText(editor)
            val file = checkNotNull(service<NxlsDocuments>().getFile(editor.getDocument()))
            val recording =
                automationOutput()
                    .listDirectoryEntries("$label-*")
                    .filter { it.isDirectory() }
                    .maxBy { it.fileName.toString() }
            fun completionLabels(at: Int): List<String> = withReadAction {
                nxlsPlatformClient(project)
                    .getRequestExecutor()
                    .getCompletionList(file, at, true)
                    ?.getItems()
                    ?.map { it.getLabel() }
            }
                .orEmpty()
            try {
                for ((form, entry) in
                    listOf("object" to "{\"plugin\": \"\"}", "string" to "\"\"")) {
                    val text = "{\n  \"analytics\": false,\n  \"plugins\": [$entry]\n}\n"
                    val offset = text.indexOf("\"\"") + 1
                    nxlsReplace(editor, text, offset)
                    var labels = emptyList<String>()
                    runCatching {
                        nxlsWait(
                            25.seconds,
                            { "$form completion missing $expectedPlugins; got $labels" },
                        ) {
                            labels = completionLabels(offset)
                            expectedPlugins.all { it in labels }
                        }
                    }
                    nxlsFocusEditor(editor)
                    nxlsHideLookup(project)
                    invokeAction("CodeCompletion", component = editor.getContentComponent())
                    var popupLabels = emptyList<String>()
                    runCatching {
                        nxlsWait(10.seconds, { "No $form completion popup" }) {
                            withContext(OnDispatcher.EDT) {
                                val lookup = service<NxlsLookups>(project).getActiveLookup()
                                if (lookup == null || lookup.isCalculating())
                                    return@withContext false
                                popupLabels = lookup.getItems().map { it.getLookupString() }
                                true
                            }
                        }
                    }
                    val first = recording.listDirectoryEntries("frame-*.png").size
                    nxlsWait(15.seconds, { "Recorder did not capture $form completion" }) {
                        recording.listDirectoryEntries("frame-*.png").size >= first + 4
                    }
                    val held =
                        withContext(OnDispatcher.EDT) {
                            service<NxlsLookups>(project).getActiveLookup() != null
                        }
                    if (!held) popupLabels = emptyList()
                    val last = recording.listDirectoryEntries("frame-*.png").size - 1
                    report.appendLine("$form completion frames: $first-$last")
                    report.appendLine("$form LSP items: $labels")
                    report.appendLine("$form lookup items: $popupLabels")
                    for (expected in expectedPlugins) {
                        if (expected !in labels || popupLabels.none { it.contains(expected) }) {
                            failures.add("$form missing $expected in LSP response or actual lookup")
                        }
                    }
                    if (popupLabels.any { it.contains(builtInPlugin) }) {
                        failures.add("$form lookup includes built-in plugin $builtInPlugin")
                    }
                    nxlsHideLookup(project)
                    val keys = completionLabels(text.indexOf("analytics"))
                    report.appendLine("$form root-key control: $keys")
                    check(keys.isNotEmpty()) { "Root-key completion control failed" }
                }
            } finally {
                nxlsHideLookup(project)
                nxlsReplace(editor, original, 0)
                withWriteAction { service<NxlsDocuments>().saveDocument(editor.getDocument()) }
            }
            report.appendLine("Failures: $failures")
            report.appendLine("RESULT: ${if (failures.isEmpty()) "PASS" else "FAIL"}")
            automationOutput().resolve("$label.txt").writeText(report.toString())
            println(report)
            check(failures.isEmpty()) { "nx.json plugin completion assertions failed: $failures" }
        }
    } finally {
        autoSave.finish()
    }
}
