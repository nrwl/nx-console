package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.AdvancedSettingsRef
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.ui.components.common.jcef
import com.intellij.driver.sdk.ui.components.elements.JListUiComponent
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.awt.event.InputEvent
import java.nio.file.Path
import kotlin.io.path.exists
import kotlin.io.path.writeText
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("com.intellij.execution.ui.RunContentManager")
interface DryRunContentManager {
    fun getAllDescriptors(): List<DryRunDescriptor>
}

@Remote("com.intellij.execution.ui.RunContentDescriptor")
interface DryRunDescriptor {
    fun getDisplayName(): String

    fun getAttachedContent(): DryRunContent?

    fun getProcessHandler(): DryRunProcessHandler?

    fun getExecutionConsole(): DryRunConsole?
}

@Remote("com.intellij.ui.content.Content")
interface DryRunContent {
    fun isPinned(): Boolean

    fun getManager(): DryRunContentManagerUi?
}

@Remote("com.intellij.ui.content.ContentManager")
interface DryRunContentManagerUi {
    fun removeContent(content: DryRunContent, dispose: Boolean): Boolean
}

@Remote("com.intellij.execution.process.ProcessHandler")
interface DryRunProcessHandler {
    fun isProcessTerminated(): Boolean
}

@Remote("com.intellij.execution.impl.ConsoleViewImpl")
interface DryRunConsole {
    fun flushDeferredText()

    fun getText(): String
}

@Remote("javax.swing.JList")
interface DryRunGeneratorList {
    fun setSelectedIndex(index: Int)
}

@Remote("com.intellij.openapi.ui.popup.util.PopupUtil")
interface DryRunPopupUtil {
    fun getPopupContainerFor(component: Component): DryRunPopup?
}

@Remote("com.intellij.openapi.ui.popup.JBPopup")
interface DryRunPopup {
    fun closeOk(event: InputEvent?)
}

private const val PINNED_TABS_SETTING = "start.run.configurations.pinned"
private const val GENERATE_UI_ACTION = "dev.nx.console.generate.actions.NxGenerateUiAction"
private const val GENERATOR_ROW = "@fixture/notes-plugin - note"
private const val TAB_NAME = "Nx Generate"

private fun Driver.generatorTabs(project: Project): List<DryRunDescriptor> =
    withContext(OnDispatcher.EDT) {
        service<DryRunContentManager>(project).getAllDescriptors().filter {
            it.getDisplayName() == TAB_NAME
        }
    }

private fun Driver.consoleText(descriptor: DryRunDescriptor): String =
    withContext(OnDispatcher.EDT) {
        runCatching {
                val console = descriptor.getExecutionConsole() ?: return@runCatching ""
                console.flushDeferredText()
                console.getText()
            }
            .getOrDefault("")
    }

private fun waitUntil(timeout: Duration, message: () -> String, condition: () -> Boolean) {
    val deadline = System.nanoTime() + timeout.inWholeNanoseconds
    while (!condition()) {
        check(System.nanoTime() < deadline, message)
        Thread.sleep(250)
    }
}

private fun Driver.chooseGenerator(frame: Component) {
    invokeAction(GENERATE_UI_ACTION, component = frame)
    var items = emptyList<String>()
    var lastError: Throwable? = null
    waitUntil(
        60.seconds,
        {
            "The generator popup never listed $GENERATOR_ROW; saw $items; last error: ${lastError?.stackTraceToString()}"
        },
    ) {
        ui.xx("//div[@class='JBList']", JListUiComponent::class.java).list().any { list ->
            runCatching {
                    items = list.items
                    val index = items.indexOfFirst { it.startsWith(GENERATOR_ROW) }
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

private fun Driver.setNoteName(name: String) {
    val result =
        ui.jcef()
            .jcefWorker
            .callJs(
                """(() => {
                  const input = document.getElementById('name-field');
                  if (!input) return 'missing';
                  input.focus();
                  input.value = '$name';
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  return input.value;
                })()""",
                5000,
            )
    check(result == name) { "Could not type into the Generate UI name field: $result" }
}

private fun Driver.removeGeneratorTabs(project: Project) {
    withContext(OnDispatcher.EDT) {
        service<DryRunContentManager>(project).getAllDescriptors().forEach { descriptor ->
            if (descriptor.getDisplayName() == TAB_NAME) {
                descriptor.getAttachedContent()?.let { content ->
                    content.getManager()?.removeContent(content, true)
                }
            }
        }
    }
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val workspace = Path.of(project.getBasePath())
    check(workspace.fileName.toString() == "generate-dry-run-tabs-fixture")
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
    removeGeneratorTabs(project)

    val settings = utility<AdvancedSettingsRef>()
    val pinnedBefore = settings.getBoolean(PINNED_TABS_SETTING)
    val pinned = System.getenv("NX_AUTOMATION_PINNED_TABS")?.toBooleanStrict() ?: true
    settings.setBoolean(PINNED_TABS_SETTING, pinned)
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "issue-2054-repro"
    val report = StringBuilder()
    report.appendLine("Issue #2054: Generate UI dry runs and Run tool window tabs")
    report.appendLine("Advanced setting $PINNED_TABS_SETTING: $pinned (was $pinnedBefore)")
    report.appendLine("Generator: $GENERATOR_ROW, dry run on change enabled")
    try {
        recordIde(label) {
            chooseGenerator(frame)
            waitUntil(60.seconds, { "The Generate UI form did not render a name field" }) {
                runCatching {
                        ui.jcef()
                            .jcefWorker
                            .callJs("String(document.getElementById('name-field') !== null)", 1000)
                    }
                    .getOrNull() == "true"
            }
            Thread.sleep(2000)
            val names = listOf("first-note", "second-note", "third-note")
            names.forEachIndexed { index, name ->
                setNoteName(name)
                var tabs = emptyList<DryRunDescriptor>()
                waitUntil(90.seconds, { "No finished dry run for $name" }) {
                    tabs = generatorTabs(project)
                    tabs.any { tab ->
                        tab.getProcessHandler()?.isProcessTerminated() == true &&
                            consoleText(tab).contains("notes/$name.md")
                    }
                }
                val pinnedTabs =
                    withContext(OnDispatcher.EDT) {
                        tabs.map { it.getAttachedContent()?.isPinned() }
                    }
                report.appendLine(
                    "After dry run ${index + 1} ($name): ${tabs.size} '$TAB_NAME' tab(s), pinned=$pinnedTabs"
                )
                Thread.sleep(2500)
            }
            val tabs = generatorTabs(project)
            val latest = tabs.map { consoleText(it) }.filter { it.contains("notes/third-note.md") }
            report.appendLine("Final '$TAB_NAME' tabs: ${tabs.size}")
            report.appendLine("Tabs showing the latest dry run: ${latest.size}")
            report.appendLine("notes/ written to disk: ${workspace.resolve("notes").exists()}")
            println(report)
            automationOutput()
                .resolve("$label-${System.currentTimeMillis()}.txt")
                .writeText(report.toString())
            check(!workspace.resolve("notes").exists()) { "A dry run wrote files: $report" }
            check(latest.size == 1) { "The latest dry run output is not shown: $report" }
            check(tabs.size == 1) {
                "Each Generate UI dry run opened a new Run tab instead of reusing one: $report"
            }
        }
    } finally {
        settings.setBoolean(PINNED_TABS_SETTING, pinnedBefore)
    }
}
