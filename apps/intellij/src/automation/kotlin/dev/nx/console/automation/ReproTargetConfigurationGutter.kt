package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.FileEditorManager
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.VirtualFile
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.ui.components.common.EditorGutterComponentImpl
import com.intellij.driver.sdk.ui.components.common.GutterIconWithLocation
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForCodeAnalysis
import com.intellij.driver.sdk.waitForProjectOpen
import java.awt.event.InputEvent
import java.awt.event.MouseEvent
import java.nio.file.Path
import kotlin.io.path.deleteIfExists
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("com.intellij.openapi.editor.ex.EditorEx")
interface GutterEditor {
    fun getGutterComponentEx(): GutterComponent
}

@Remote("com.intellij.openapi.editor.ex.EditorGutterComponentEx")
interface GutterComponent : Component {
    fun dispatchEvent(event: GutterMouseEvent)
}

@Remote("java.awt.event.MouseEvent") interface GutterMouseEvent

@Remote("javax.swing.AbstractButton")
interface GutterMenuItem {
    fun getText(): String?

    fun isEnabled(): Boolean

    fun doClick()
}

@Remote("javax.swing.MenuSelectionManager")
interface GutterMenuSelection {
    fun defaultManager(): GutterMenuSelection

    fun clearSelectedPath()
}

@Remote("com.intellij.execution.RunManager")
interface GutterRunManager {
    fun getSelectedConfiguration(): GutterRunSettings?
}

@Remote("com.intellij.execution.RunnerAndConfigurationSettings")
interface GutterRunSettings {
    fun getName(): String
}

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface GutterFileSystem {
    fun getInstance(): GutterFileSystem

    fun refreshAndFindFileByPath(path: String): VirtualFile?
}

private data class GutterCase(
    val projectJson: String,
    val outputName: String,
    val expectedConfiguration: String,
)

private fun Driver.runConfigurationFromGutter(
    project: Project,
    workspace: Path,
    case: GutterCase,
): String {
    val output = workspace.resolve(".nx/automation-config-${case.outputName}.json")
    output.deleteIfExists()
    openFile(case.projectJson)
    val file = checkNotNull(service<FileEditorManager>(project).getCurrentFile())
    waitForCodeAnalysis(project, file, 1.minutes)
    val editor = checkNotNull(service<FileEditorManager>(project).getSelectedTextEditor())
    val text = editor.getDocument().getText()
    val offset = text.indexOf("\"production\"")
    check(offset >= 0) { "${case.projectJson} has no production configuration" }
    val line = editor.getDocument().getLineNumber(offset)
    withContext(OnDispatcher.EDT) { editor.getCaretModel().moveToOffset(offset + 1) }
    val gutterComponent = cast(editor, GutterEditor::class).getGutterComponentEx()
    val gutter = cast(gutterComponent, EditorGutterComponentImpl::class)
    val report = StringBuilder()
    report.appendLine("${case.projectJson}, line ${line + 1} (\"production\")")

    var mark: GutterIconWithLocation? = null
    val markDeadline = System.nanoTime() + 30.seconds.inWholeNanoseconds
    while (mark == null && System.nanoTime() < markDeadline) {
        mark =
            withContext(OnDispatcher.EDT) {
                gutter.getLineGutterMarks().firstOrNull {
                    it.getLine() == line &&
                        it.getMark().getTooltipText()?.contains("Run Target") == true
                }
            }
        if (mark == null) Thread.sleep(500)
    }
    val icon = checkNotNull(mark) { "No Run Target gutter icon on line ${line + 1}" }
    report.appendLine(
        "  gutter icon: ${icon.getMark().getTooltipText()?.replace(Regex("<[^>]+>|&nbsp;"), " ")}"
    )
    Thread.sleep(1500)

    // Left-click the icon by dispatching AWT events to the gutter inside the IDE process, so the
    // IDE opens its own gutter popup without native input.
    val point = icon.getLocation()
    listOf(MouseEvent.MOUSE_PRESSED, MouseEvent.MOUSE_RELEASED, MouseEvent.MOUSE_CLICKED).forEach {
        id ->
        val event =
            new(
                GutterMouseEvent::class,
                gutterComponent,
                id,
                System.currentTimeMillis(),
                if (id == MouseEvent.MOUSE_PRESSED) InputEvent.BUTTON1_DOWN_MASK else 0,
                point.x + 6,
                point.y + 6,
                1,
                false,
                MouseEvent.BUTTON1,
            )
        withContext(OnDispatcher.EDT) { gutterComponent.dispatchEvent(event) }
        Thread.sleep(60)
    }

    // The gutter opens its actions as a Swing popup menu in its own window.
    var items: List<GutterMenuItem> = emptyList()
    val menuDeadline = System.nanoTime() + 10.seconds.inWholeNanoseconds
    while (items.isEmpty() && System.nanoTime() < menuDeadline) {
        items =
            ui.xx("//div[@class='ActionMenuItem']").list().map {
                cast(it.component, GutterMenuItem::class)
            }
        if (items.isEmpty()) Thread.sleep(250)
    }
    if (items.isEmpty()) {
        report.appendLine("  RESULT: FAIL (clicking the gutter icon opened no menu)")
        return report.toString()
    }
    val rows =
        withContext(OnDispatcher.EDT) {
            items.map { Triple(it, it.getText().orEmpty(), it.isEnabled()) }
        }
    report.appendLine(
        "  gutter menu: " +
            rows.joinToString { (_, text, enabled) -> if (enabled) text else "$text (disabled)" }
    )
    runCatching { captureIdeWindows("gutter-menu-${case.outputName}") }
    Thread.sleep(3000)

    val run = rows.firstOrNull { (_, text, enabled) -> text.startsWith("Run ") && enabled }
    if (run == null) {
        withContext(OnDispatcher.EDT) {
            utility<GutterMenuSelection>().defaultManager().clearSelectedPath()
        }
        report.appendLine("  target received: nothing (the gutter menu has no Run entry)")
        report.appendLine("  RESULT: FAIL")
        return report.toString()
    }
    withContext(OnDispatcher.EDT) {
        run.first.doClick()
        utility<GutterMenuSelection>().defaultManager().clearSelectedPath()
    }
    val runDeadline = System.nanoTime() + 60.seconds.inWholeNanoseconds
    while (!output.exists() && System.nanoTime() < runDeadline) Thread.sleep(250)
    val selected =
        withContext(OnDispatcher.EDT) {
            service<GutterRunManager>(project).getSelectedConfiguration()?.getName()
        }
    report.appendLine("  run configuration: $selected")
    report.appendLine(
        "  target received: ${if (output.exists()) output.readText() else "nothing (no task ran)"}"
    )
    val passed =
        output.exists() &&
            output.readText().contains("--mode=${case.expectedConfiguration}") &&
            selected?.contains(":${case.expectedConfiguration}") == true
    report.appendLine("  RESULT: ${if (passed) "PASS" else "FAIL"}")
    return report.toString()
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val workspace = Path.of(project.getBasePath())
    check(workspace.fileName.toString() == "config-gutter-ts-fixture")
    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, GraphIdeFrame::class).apply {
            setExtendedState(0)
            getBalloonLayout().closeAll()
        }
    }
    withContext(OnDispatcher.EDT) {
        utility<GutterMenuSelection>().defaultManager().clearSelectedPath()
    }
    runCatching { invokeAction("CloseAllEditors", component = frame) }
    runCatching { closeToolWindow("Run") }
    closeToolWindow("Project")

    val cases =
        listOf(
            GutterCase("packages/named/project.json", "named", "production"),
            GutterCase("packages/shop/project.json", "shop", "production"),
        )
    inspectIde()
    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "target-configuration-gutter-repro") {
        Thread.sleep(2000)
        val results =
            cases.map { case ->
                runConfigurationFromGutter(project, workspace, case).also {
                    println(it)
                    Thread.sleep(4000)
                }
            }
        val report =
            "Run a target configuration from the project.json gutter\n" +
                "named: project.json has \"name\". shop: name comes from package.json (@fixture/shop).\n\n" +
                results.joinToString("\n")
        automationOutput()
            .resolve("target-configuration-gutter-${System.currentTimeMillis()}.txt")
            .writeText(report)
        val resultFile = workspace.resolve("gutter-result.txt")
        resultFile.writeText(report)
        checkNotNull(
            utility<GutterFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(resultFile.toString())
        )
        openFile("gutter-result.txt")
        Thread.sleep(5000)
        val failed = results.filterNot { it.contains("RESULT: PASS") }
        check(failed.isEmpty()) { "Gutter run failed:\n${failed.joinToString("\n")}" }
    }
}
