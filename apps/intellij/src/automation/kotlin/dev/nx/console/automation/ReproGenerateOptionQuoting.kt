package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.ui.components.common.jcef
import com.intellij.driver.sdk.ui.components.elements.JListUiComponent
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.deleteIfExists
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("dev.nx.console.settings.NxConsoleSettingsProvider", plugin = "dev.nx.console")
interface QuotingSettings {
    fun getEnableDryRunOnGenerateChange(): Boolean

    fun setEnableDryRunOnGenerateChange(value: Boolean)
}

private fun quotingJson(value: String): String =
    "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

private const val QUOTING_GENERATE_ACTION = "dev.nx.console.generate.actions.NxGenerateUiAction"
private const val QUOTING_GENERATOR_ROW = "@fixture/notes-plugin - note"

private fun quotingWait(timeout: Duration, message: () -> String, condition: () -> Boolean) {
    val deadline = System.nanoTime() + timeout.inWholeNanoseconds
    while (!condition()) {
        check(System.nanoTime() < deadline, message)
        Thread.sleep(250)
    }
}

private fun Driver.chooseQuotingGenerator(frame: Component) {
    invokeAction(QUOTING_GENERATE_ACTION, component = frame)
    var items = emptyList<String>()
    var lastError: Throwable? = null
    quotingWait(
        60.seconds,
        {
            "The generator popup never listed $QUOTING_GENERATOR_ROW; saw $items; last error: ${lastError?.stackTraceToString()}"
        },
    ) {
        ui.xx("//div[@class='JBList']", JListUiComponent::class.java).list().any { list ->
            runCatching {
                    items = list.items
                    val index = items.indexOfFirst { it.startsWith(QUOTING_GENERATOR_ROW) }
                    if (index < 0) return@runCatching false
                    withContext(OnDispatcher.EDT) {
                        cast(list.component, DryRunGeneratorList::class).setSelectedIndex(index)
                        checkNotNull(
                                utility<DryRunPopupUtil>().getPopupContainerFor(list.component)
                            )
                            .closeOk(null)
                    }
                    true
                }
                .onFailure { lastError = it }
                .getOrDefault(false)
        }
    }
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val workspace = Path.of(project.getBasePath())
    check(workspace.fileName.toString() == "generate-option-quoting")
    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, GraphIdeFrame::class).apply {
            setExtendedState(0)
            toFront()
            getBalloonLayout().closeAll()
        }
    }
    val settings = service<QuotingSettings>()
    val before = settings.getEnableDryRunOnGenerateChange()
    settings.setEnableDryRunOnGenerateChange(false)
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "generate-option-quoting"
    val report = StringBuilder("Generate option quoting: real JCEF Generate button click\n")
    val mismatches = mutableListOf<String>()
    try {
        recordIde(label) {
            try {
                listOf("it's \$HOME", "a'b\"c", "price\$5", "a&b").forEachIndexed { index, expected
                    ->
                    val name = "case-${index + 1}"
                    val output = workspace.resolve("notes/$name.json")
                    output.deleteIfExists()
                    runCatching { invokeAction("CloseAllEditors", component = frame) }
                    runCatching { closeToolWindow("Run") }
                    chooseQuotingGenerator(frame)
                    quotingWait(60.seconds, { "Generate UI fields did not render" }) {
                        runCatching {
                                ui.jcef()
                                    .jcefWorker
                                    .callJs("String(!!document.getElementById('text-field'))", 1000)
                            }
                            .getOrNull() == "true"
                    }
                    val inputs = "{\"name\":${quotingJson(name)},\"text\":${quotingJson(expected)}}"
                    val typed =
                        ui.jcef()
                            .jcefWorker
                            .callJs(
                                """(() => {
                        const values = $inputs;
                        for (const [key, value] of Object.entries(values)) {
                            const input = document.getElementById(key + '-field');
                            input.focus(); input.value = value;
                            input.dispatchEvent(new Event('input', {bubbles: true}));
                        }
                        return document.getElementById('text-field').value;
                    })()""",
                                5000,
                            )
                    check(typed == expected) { "Input mismatch: $typed" }
                    Thread.sleep(1500)
                    val clicked =
                        ui.jcef()
                            .jcefWorker
                            .callJs(
                                """(() => {
                        const button = document.querySelector('[data-cy="generate-button"]');
                        if (!button) return 'missing';
                        button.click(); return 'clicked';
                    })()""",
                                5000,
                            )
                    check(clicked == "clicked")
                    quotingWait(90.seconds, { "Generate did not write $output" }) {
                        output.exists()
                    }
                    val actual = output.readText()
                    val expectedJson = "{\"text\":${quotingJson(expected)}}"
                    val result =
                        "$name ${if (actual == expectedJson) "PASS" else "FAIL"}: expected=$expectedJson actual=$actual"
                    report.appendLine(result)
                    println(result)
                    if (actual != expectedJson) mismatches.add(result)
                    checkNotNull(
                        utility<RunArgumentsFileSystem>()
                            .getInstance()
                            .refreshAndFindFileByPath(output.toString())
                    )
                    openFile("notes/$name.json")
                    Thread.sleep(3500)
                }
                check(mismatches.isEmpty()) {
                    "Generator option mismatches:\n${mismatches.joinToString("\n")}"
                }
            } finally {
                automationOutput().resolve("$label.txt").writeText(report.toString())
            }
        }
    } finally {
        settings.setEnableDryRunOnGenerateChange(before)
    }
}
