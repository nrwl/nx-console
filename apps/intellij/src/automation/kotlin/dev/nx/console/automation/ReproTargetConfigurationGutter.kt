package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.LockSemantics
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.ActionManager
import com.intellij.driver.sdk.AnAction
import com.intellij.driver.sdk.FileEditorManager
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.VirtualFile
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForCodeAnalysis
import com.intellij.driver.sdk.waitForProjectOpen
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
    fun getGutterRenderers(line: Int): List<GutterIconRef>
}

@Remote("com.intellij.openapi.editor.markup.GutterIconRenderer")
interface GutterIconRef {
    fun getTooltipText(): String?

    fun getPopupMenuActions(): GutterActionGroup?
}

@Remote("com.intellij.openapi.actionSystem.AnActionEvent") interface GutterActionEvent

@Remote("com.intellij.openapi.actionSystem.ActionGroup")
interface GutterActionGroup {
    fun getChildren(event: GutterActionEvent?): Array<GutterAction>
}

@Remote("com.intellij.openapi.actionSystem.ActionWithDelegate")
interface GutterAction {
    fun getDelegate(): AnAction
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
    val gutter = cast(editor, GutterEditor::class).getGutterComponentEx()

    val deadline = System.nanoTime() + 30.seconds.inWholeNanoseconds
    var actions: List<GutterAction> = emptyList()
    var tooltips: List<String?> = emptyList()
    while (actions.isEmpty() && System.nanoTime() < deadline) {
        withContext(OnDispatcher.EDT, LockSemantics.READ_ACTION) {
            val renderers = gutter.getGutterRenderers(line)
            tooltips = renderers.map { runCatching { it.getTooltipText() }.getOrNull() }
            actions =
                renderers.flatMap { renderer ->
                    renderer.getPopupMenuActions()?.getChildren(null)?.toList() ?: emptyList()
                }
        }
        if (actions.isEmpty()) Thread.sleep(500)
    }
    val names =
        actions.map { action -> runCatching { action.getDelegate().getTemplateText() }.getOrNull() }
    val runAction =
        actions.zip(names).firstOrNull { (_, name) -> name == "Run context configuration" }?.first
    val report = StringBuilder()
    report.appendLine("${case.projectJson}, line ${line + 1} (\"production\")")
    report.appendLine("  gutter icons: ${tooltips.size} ${tooltips}")
    report.appendLine("  gutter menu actions: $names")
    if (runAction == null) {
        report.appendLine("  RESULT: no Run action in the gutter menu")
        return report.toString()
    }

    val callback =
        withContext(OnDispatcher.EDT, LockSemantics.READ_ACTION) {
            service<ActionManager>()
                .tryToExecute(cast(runAction, AnAction::class), null, gutter, "EditorGutter", true)
        }
    if (callback.isRejected()) {
        report.appendLine("  RESULT: gutter Run action rejected (${callback.getError()})")
        return report.toString()
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
