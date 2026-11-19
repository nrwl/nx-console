package dev.nx.console.automation

import com.intellij.driver.client.service
import com.intellij.driver.sdk.getHighlights
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.waitForProjectOpen
import kotlin.io.path.copyTo
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

/**
 * Expects child/project.json with cache: false and packages/pkg/package.json with version 1.0.0.
 */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    nxlsRunning(project)
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "project-json-schema"
    val out = automationOutput().resolve(label).createDirectories()
    val report = StringBuilder()
    val failures = mutableListOf<String>()
    val autoSave = service<NxlsAutoSave>().disableAutoSave()
    recordIde(label) {
        try {
            for ((path, valid, invalid, expected) in
                listOf(
                    listOf(
                        "packages/parent/child/project.json",
                        "\"cache\": false",
                        "\"cache\": \"incorrect-type\"",
                        "boolean",
                    ),
                    listOf(
                        "packages/pkg/package.json",
                        "\"version\": \"1.0.0\"",
                        "\"version\": 42",
                        "string",
                    ),
                )) {
                openFile(path, waitForCodeAnalysis = false)
                val editor = nxlsEditor(project)
                val original = nxlsText(editor)
                check(original.contains(valid)) { "Missing fixture content: $valid" }
                try {
                    val edited = original.replace(valid, invalid)
                    nxlsReplace(editor, edited, edited.indexOf(invalid))
                    var highlights = emptyList<String>()
                    val validated = runCatching {
                        nxlsWait(
                            30.seconds,
                            { "Missing $expected type diagnostic in $path: $highlights" },
                        ) {
                            highlights =
                                getHighlights(editor.getDocument(), project).mapNotNull {
                                    it.getDescription()
                                }
                            highlights.any {
                                it.contains("Incompatible types") && it.contains(expected)
                            }
                        }
                    }
                        .isSuccess
                    report.appendLine("$path unsaved type diagnostic=$validated: $highlights")
                    if (!validated) failures.add("$path: missing $expected type diagnostic")
                    val preview = checkNotNull(service<NxlsEditors>(project).getSelectedEditor())
                    preview.showWithPreview()
                    report.appendLine("$path Project Details editor available")
                    captureIdeWindows("$label-${path.substringAfterLast('/')}").forEach {
                        it.copyTo(out.resolve(it.fileName), overwrite = true)
                    }
                } finally {
                    nxlsReplace(editor, original, 0)
                    withWriteAction { service<NxlsDocuments>().saveDocument(editor.getDocument()) }
                }
            }
            report.appendLine("RESULT: ${if (failures.isEmpty()) "PASS" else "FAIL"}")
            check(failures.isEmpty()) { failures.joinToString("; ") }
        } finally {
            autoSave.finish()
            out.resolve("observations.txt").writeText(report.toString())
            println(report)
        }
    }
}
