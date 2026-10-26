package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.utility
import com.intellij.driver.model.LockSemantics
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Document
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.VirtualFile
import com.intellij.driver.sdk.getHighlights
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForCodeAnalysis
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("com.intellij.openapi.wm.impl.IdeFrameImpl")
interface ScssIdeFrame {
    fun setExtendedState(state: Int)

    fun toFront()

    fun getBalloonLayout(): ScssBalloonLayout
}

@Remote("com.intellij.ui.BalloonLayoutImpl")
interface ScssBalloonLayout {
    fun closeAll()
}

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface ScssFileSystem {
    fun getInstance(): ScssFileSystem

    fun refreshAndFindFileByPath(path: String): VirtualFile?
}

@Remote("com.intellij.openapi.fileEditor.FileDocumentManager")
interface ScssDocumentManager {
    fun getInstance(): ScssDocumentManager

    fun getDocument(file: VirtualFile): Document?
}

/** Component styles in the app, which declares stylePreprocessorOptions.includePaths. */
private const val APP_SCSS = "apps/nx-default/src/app/app.component.scss"

/** Component styles in a library without a build target, compiled as part of the app. */
private const val LIB_SCSS = "libs/my-lib/src/lib/my-comp/my-comp.component.scss"

/** Highlights about the `mixins` partial that only exists on the app's include path. */
private fun Driver.mixinProblems(project: Project, relativePath: String): List<String> {
    val workspace = Path.of(project.getBasePath())
    val file =
        checkNotNull(
            utility<ScssFileSystem>()
                .getInstance()
                .refreshAndFindFileByPath(workspace.resolve(relativePath).toString())
        )
    openFile(relativePath)
    waitForCodeAnalysis(project, file, 1.minutes)
    val document =
        withContext(OnDispatcher.DEFAULT, LockSemantics.READ_ACTION) {
            checkNotNull(utility<ScssDocumentManager>().getInstance().getDocument(file))
        }
    return getHighlights(document, project)
        .mapNotNull { it.getDescription() }
        .filter { it.contains("mixin", ignoreCase = true) }
}

/**
 * Opens a component stylesheet in the app and one in a library that has no build target. Both `@use
 * "mixins"`, a partial found only through the app's `stylePreprocessorOptions.includePaths`.
 * Angular compiles the library's styles as part of the app, so neither file may show an unresolved
 * `mixins` import or mixin.
 */
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val frame = ui.x("//div[@class='IdeFrameImpl']").component
    withContext(OnDispatcher.EDT) {
        cast(frame, ScssIdeFrame::class).apply {
            setExtendedState(0)
            toFront()
            getBalloonLayout().closeAll()
        }
    }
    runCatching { invokeAction("CloseAllEditors", component = frame) }

    // The app's stylesheet is the control: once it resolves, Nx Console has registered the
    // workspace's Angular projects.
    val deadline = System.nanoTime() + 3.minutes.inWholeNanoseconds
    var appProblems = mixinProblems(project, APP_SCSS)
    while (appProblems.isNotEmpty()) {
        check(System.nanoTime() < deadline) {
            "Setup: the app stylesheet never resolved its include path: $appProblems"
        }
        Thread.sleep(5.seconds.inWholeMilliseconds)
        appProblems = mixinProblems(project, APP_SCSS)
    }

    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "library-scss-include-paths"
    var libProblems = emptyList<String>()
    recordIde(label) {
        Thread.sleep(1500)
        openFile(APP_SCSS)
        Thread.sleep(2500)
        libProblems = mixinProblems(project, LIB_SCSS)
        Thread.sleep(4000)
    }

    val report = buildString {
        appendLine("$APP_SCSS mixin problems: $appProblems")
        appendLine("$LIB_SCSS mixin problems: $libProblems")
    }
    println(report)
    automationOutput()
        .resolve("$label-${System.currentTimeMillis()}")
        .createDirectories()
        .resolve("report.txt")
        .writeText(report)

    check(libProblems.isEmpty()) {
        "The library stylesheet cannot resolve the app's include path: $libProblems"
    }
    println("PASS: the library stylesheet resolves mixins through the app's include path")
}
