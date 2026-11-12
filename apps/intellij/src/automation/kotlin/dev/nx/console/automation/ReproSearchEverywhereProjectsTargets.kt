package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.ui.components.common.jcef
import com.intellij.driver.sdk.ui.components.common.popups.searchEverywherePopup
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.deleteIfExists
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("javax.swing.JList")
interface NxSearchResultList {
    fun setSelectedIndex(index: Int)
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    nxlsRunning(project)
    val frame = nxlsFrame()
    if (service<StalledFileEditorManager>(project).getSelectedFiles().isNotEmpty()) {
        invokeAction("CloseAllEditors", component = frame)
    }
    val marker = Path.of(project.getBasePath(), ".nx/search-everywhere-marker.json")
    marker.deleteIfExists()
    val note = Path.of(project.getBasePath(), "notes/search-everywhere-note.md")
    note.deleteIfExists()
    val settings = service<QuotingSettings>()
    val dryRunBefore = settings.getEnableDryRunOnGenerateChange()
    settings.setEnableDryRunOnGenerateChange(false)
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "search-projects-targets"
    val report =
        StringBuilder(
            "Search Everywhere projects and targets\nSDK action opens Search Everywhere; direct Swing text and list selection; SDK Enter action.\n"
        )
    var popup = ui.searchEverywherePopup()
    var search = popup.searchField
    recordIde(label) {
        fun waitForRecordedFrames(checkpoint: String = "Search results") {
            val recording =
                Files.list(automationOutput()).use { paths ->
                    paths
                        .filter {
                            Files.isDirectory(it) && it.fileName.toString().startsWith("$label-")
                        }
                        .max(compareBy { it.fileName.toString() })
                        .orElseThrow()
                }
            fun frameCount() =
                Files.list(recording).use { paths ->
                    paths
                        .filter {
                            it.fileName.toString().startsWith("frame-") &&
                                it.toString().endsWith(".png")
                        }
                        .count()
                }
            val before = frameCount()
            nxlsWait(15.seconds, { "Recorder did not capture the current UI" }) {
                frameCount() >= before + 4
            }
            report.appendLine("Recorded $checkpoint: frames $before through ${frameCount() - 1}")
        }
        try {
            if (popup.present())
                withContext(OnDispatcher.EDT) {
                    utility<GeneratorSearchPopupUtil>()
                        .getPopupContainerFor(search.component)
                        ?.cancel()
                }
            invokeAction("SearchEverywhere", component = frame)
            nxlsWait(message = { "Search Everywhere did not open" }) { search.present() }
            fun query(text: String, expected: List<String>): List<String> {
                withContext(OnDispatcher.EDT) {
                    cast(search.component, GeneratorSearchField::class).setText(text)
                }
                var rows = emptyList<String>()
                try {
                    nxlsWait(30.seconds, { "Query '$text': expected $expected, rendered $rows" }) {
                        rows =
                            if (popup.resultsList.present()) popup.resultsList.items
                            else emptyList()
                        expected.all { expectedRow -> rows.any { it.contains(expectedRow) } }
                    }
                    waitForRecordedFrames()
                    rows = popup.resultsList.items
                } finally {
                    report.appendLine("Query '$text': $rows")
                }
                return rows
            }
            fun selectResult(text: String) {
                val list = popup.resultsList
                nxlsWait(10.seconds, { "Could not select rendered result '$text'" }) {
                    val index = list.items.indexOfFirst { it.contains(text) }
                    if (index < 0) false
                    else {
                        withContext(OnDispatcher.EDT) {
                            cast(list.component, NxSearchResultList::class).setSelectedIndex(index)
                        }
                        list.selectedItems.any { it.contains(text) }
                    }
                }
                popup.invokeSelectAction()
            }
            query("@fixture", listOf("@fixture/notes-plugin - note"))
            selectResult("@fixture/notes-plugin - note")
            var generateState = ""
            nxlsWait(60.seconds, { "Generate UI did not populate the note form: $generateState" }) {
                generateState =
                    runCatching {
                            ui.jcef()
                                .jcefWorker
                                .callJs(
                                    """(() => {
                            const header = document.querySelector('header');
                            const title = header?.querySelector('[data-cy="title"]')?.textContent.trim();
                            const subtitle = header?.querySelector('[data-cy="subtitle"]')?.cloneNode(true);
                            subtitle?.querySelectorAll('popover-element').forEach(e => e.remove());
                            const collection = subtitle?.textContent.trim();
                            const fields = [...document.querySelectorAll('input[id$="-field"]')]
                                .filter(e => e.getBoundingClientRect().height > 0).map(e => e.id);
                            return JSON.stringify({title, collection, fields,
                                ready: title === 'Note' && collection === '@fixture/notes-plugin'
                                    && fields.includes('name-field')});
                        })()""",
                                    1000,
                                )
                        }
                        .getOrElse { it.toString() }
                generateState.contains("\"ready\":true")
            }
            report.appendLine("Generate UI header and fields: $generateState")
            waitForRecordedFrames("Generate UI")
            check(
                ui.jcef()
                    .jcefWorker
                    .callJs(
                        """(() => {
                    const input = document.getElementById('name-field');
                    input.focus(); input.value = 'search-everywhere-note';
                    input.dispatchEvent(new Event('input', {bubbles: true}));
                    return input.value;
                })()""",
                        5000,
                    ) == "search-everywhere-note"
            )
            nxlsWait(10.seconds, { "Generate button did not enable" }) {
                ui.jcef()
                    .jcefWorker
                    .callJs(
                        "String(!!document.querySelector('[data-cy=generate-button]:not([disabled])'))",
                        1000,
                    ) == "true"
            }
            check(!note.exists()) { "Automatic dry run unexpectedly wrote $note" }
            check(
                ui.jcef()
                    .jcefWorker
                    .callJs(
                        """(() => { document.querySelector('[data-cy="generate-button"]').click(); return 'clicked'; })()""",
                        5000,
                    ) == "clicked"
            )
            nxlsWait(90.seconds, { "Generator did not write $note" }) {
                note.exists() && note.readText() == "# search-everywhere-note\n"
            }
            report.appendLine(
                "Generated notes/search-everywhere-note.md: ${note.readText().trim()}"
            )
            waitForRecordedFrames("Generated note")
            invokeAction("CloseAllEditors", component = frame)
            note.deleteIfExists()
            invokeAction("SearchEverywhere", component = frame)
            popup = ui.searchEverywherePopup()
            search = popup.searchField
            nxlsWait(message = { "Search did not reopen after generation" }) { search.present() }
            query("demo hello", listOf("demo:hello Nx target"))
            query("de hel", listOf("demo:hello Nx target"))
            query("build", listOf("demo:build Nx target", "util:build Nx target"))
            query("util", listOf("util Nx project"))
            query("demo hello", listOf("demo:hello Nx target"))
            selectResult("demo:hello Nx target")
            nxlsWait(60.seconds, { "Target did not write marker" }) {
                marker.exists() && marker.readText().contains("\"project\":\"demo\"")
            }
            report.appendLine("Executed target: ${marker.readText()}")
            invokeAction("SearchEverywhere", component = frame)
            popup = ui.searchEverywherePopup()
            search = popup.searchField
            nxlsWait(message = { "Search did not reopen" }) { search.present() }
            query("util", listOf("util Nx project"))
            selectResult("util Nx project")
            nxlsWait(message = { "util project.json did not open" }) {
                service<StalledFileEditorManager>(project).getSelectedFiles().any {
                    it.getPath() ==
                        Path.of(project.getBasePath(), "libs/util/project.json").toString()
                }
            }
            nxlsWait(message = { "util project configuration text did not load" }) {
                runCatching { nxlsText(nxlsEditor(project)).contains("\"name\": \"util\"") }
                    .getOrDefault(false)
            }
            waitForRecordedFrames()
            report.appendLine("Opened util project configuration")
        } catch (error: Throwable) {
            report.appendLine(error.stackTraceToString())
            inspectIde()
            throw error
        } finally {
            settings.setEnableDryRunOnGenerateChange(dryRunBefore)
            note.deleteIfExists()
            automationOutput().resolve("$label-report.txt").writeText(report.toString())
            if (popup.present())
                withContext(OnDispatcher.EDT) {
                    utility<GeneratorSearchPopupUtil>()
                        .getPopupContainerFor(search.component)
                        ?.cancel()
                }
        }
    }
}
