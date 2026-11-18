package dev.nx.console.automation

import com.intellij.driver.client.service
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.waitForProjectOpen
import java.net.URI
import java.nio.file.Path
import kotlin.io.path.isDirectory
import kotlin.io.path.listDirectoryEntries
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val root = Path.of(project.getBasePath())
    nxlsRunning(project)
    nxlsFrame()
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "project-named-inputs"
    val report = StringBuilder("IDE ${getProductVersion()}\n")
    val failures = mutableListOf<String>()
    val autoSave = service<NxlsAutoSave>().disableAutoSave()
    try {
        recordIde(label) {
            val recording =
                automationOutput()
                    .listDirectoryEntries("$label-*")
                    .filter { it.isDirectory() }
                    .maxBy { it.fileName.toString() }

            fun checkpoint(name: String) {
                fun frameCount() = recording.listDirectoryEntries("frame-*.png").size
                val before = frameCount()
                nxlsWait(15.seconds, { "Recorder did not capture $name" }) {
                    frameCount() >= before + 4
                }
                report.appendLine("$name frames: $before-${frameCount() - 1}")
            }

            fun selectedPath(): String? =
                service<NxlsDocuments>().getFile(nxlsEditor(project).getDocument())?.getPath()

            fun verify(matches: Boolean, observation: String) {
                report.appendLine(observation)
                if (!matches) failures.add(observation)
            }

            for (path in
                listOf(
                    "packages/parent/child/project.json",
                    "packages/pkg/package.json",
                    "nx.json",
                )) {
                openFile(path)
                val editor = nxlsEditor(project)
                val original = nxlsText(editor)
                val isProject = path != "nx.json"
                val definition = original.indexOf("\"production\": [")
                val input = original.indexOf("\"production\"", original.indexOf("\"inputs\""))
                check(definition >= 0 && input >= 0)
                val emptyInput = original.removeRange(input + 1, input + "\"production".length)
                try {
                    nxlsReplace(editor, emptyInput, input + 1)
                    val labels =
                        nxlsCompletion(project, editor, "\"default\"").items.map {
                            it.getObject().getCompletionItem().getLabel()
                        }
                    val expected =
                        setOf("\"default\"", "\"^default\"", "\"production\"", "\"^production\"")
                    verify(
                        labels.toSet().containsAll(expected) &&
                            ("\"localOnly\"" in labels) == isProject,
                        "$path completion expected workspace inputs and localOnly=$isProject, got $labels",
                    )
                    checkpoint("$path completion")
                    nxlsHideLookup(project)
                    nxlsReplace(editor, original, input + 2)
                    nxlsFocusEditor(editor)
                    val file = checkNotNull(service<NxlsDocuments>().getFile(editor.getDocument()))
                    var links = emptyList<String>()
                    nxlsWait(30.seconds, { "$path has no named input document links" }) {
                        links = withReadAction {
                            nxlsPlatformClient(project)
                                .`getDocumentLinkInfos$intellij_platform_lsp_impl`(file)
                                .mapNotNull { it.getHighlightingInfo().getTargetUri() }
                        }
                        links.any { it.contains(".json#") }
                    }
                    report.appendLine("$path LSP links: $links")
                    invokeAction("GotoDeclaration", component = editor.getContentComponent())
                    val expectedFile = root.resolve(path).toString()
                    fun caret() =
                        withContext(OnDispatcher.EDT) {
                            nxlsEditor(project).getCaretModel().getOffset()
                        }
                    nxlsWait(
                        20.seconds,
                        { "$path Go to Declaration did not move the caret or open a file" },
                    ) {
                        selectedPath() != expectedFile || caret() != input + 2
                    }
                    val expectedLine = original.take(definition).count { it == '\n' } + 1
                    val actualFile = selectedPath()
                    val actualLine =
                        nxlsText(nxlsEditor(project)).take(caret()).count { it == '\n' } + 1
                    val expectedLink = URI(root.resolve(path).toUri().toString() + "#$expectedLine")
                    verify(
                        links.any { runCatching { URI(it) == expectedLink }.getOrDefault(false) },
                        "$path document link expected $expectedLink, got $links",
                    )
                    verify(
                        actualFile == expectedFile && (!isProject || actualLine == expectedLine),
                        "$path declaration expected " +
                            (if (isProject) "$expectedFile:$expectedLine" else expectedFile) +
                            ", got $actualFile:$actualLine",
                    )
                    checkpoint("$path declaration")

                    if (isProject) {
                        openFile(path)
                        val fileInput = original.indexOf("{projectRoot}/index.ts")
                        check(fileInput >= 0)
                        withContext(OnDispatcher.EDT) {
                            editor.getCaretModel().moveToOffset(fileInput + 4)
                        }
                        nxlsFocusEditor(editor)
                        invokeAction("GotoDeclaration", component = editor.getContentComponent())
                        val indexFile = root.resolve(path).parent.resolve("index.ts").toString()
                        nxlsWait(
                            20.seconds,
                            { "$path file input did not navigate to $indexFile" },
                        ) {
                            selectedPath() == indexFile
                        }
                        report.appendLine("$path file input opened $indexFile")
                    }
                } finally {
                    nxlsHideLookup(project)
                    if (nxlsText(editor) != original) nxlsReplace(editor, original, 0)
                }
            }
            check(failures.isEmpty()) {
                failures.joinToString("\n", "Named input assertions failed:\n")
            }
        }
    } finally {
        autoSave.finish()
        automationOutput().resolve("$label.txt").writeText(report.toString())
        println(report)
    }
}
