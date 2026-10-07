package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.LockSemantics
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.FileEditorManager
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.VirtualFile
import com.intellij.driver.sdk.closeToolWindow
import com.intellij.driver.sdk.getHighlights
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForCodeAnalysis
import com.intellij.driver.sdk.waitForProjectOpen
import java.awt.event.KeyEvent
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

/**
 * Issue #1986: Nx's own configuration file gets almost no help in JetBrains IDEs. Completion for
 * `project.json` comes from nxls, whose schema only described the five properties that need
 * workspace knowledge, and nxls never validated anything.
 *
 * The fix merges Nx's own `schemas/project-schema.json` into the schema nxls serves and has nxls
 * publish diagnostics, which the IntelliJ Platform LSP client renders. The IDE's own schema mapping
 * is deliberately left alone, so SchemaStore still resolves for this file: that is recorded here
 * rather than asserted away.
 *
 * Three observables:
 * 1. which schema the IDE itself resolves, expected to be unchanged,
 * 2. what basic completion offers for a property name at the top level of the object,
 * 3. whether an out-of-enum `projectType` is reported, which can only come from nxls.
 */
@Remote("com.jetbrains.jsonSchema.ide.JsonSchemaService${'$'}Impl", plugin = "dev.nx.console")
interface SchemaServiceCompanion {
    fun get(project: Project): SchemaService
}

@Remote("com.jetbrains.jsonSchema.ide.JsonSchemaService", plugin = "dev.nx.console")
interface SchemaService {
    fun isApplicableToFile(file: VirtualFile): Boolean

    fun getSchemaFilesForFile(file: VirtualFile): List<VirtualFile>
}

@Remote("com.intellij.codeInsight.lookup.LookupManager")
interface SchemaLookupManager {
    fun getInstance(project: Project): SchemaLookupManager

    fun getActiveLookup(): SchemaLookup?
}

@Remote("com.intellij.codeInsight.lookup.Lookup")
interface SchemaLookup {
    fun getItems(): List<SchemaLookupItem>
}

@Remote("com.intellij.codeInsight.lookup.LookupElement")
interface SchemaLookupItem {
    fun getLookupString(): String
}

@Remote("com.intellij.ide.impl.ProjectUtil")
interface SchemaProjectUtil {
    fun focusProjectWindow(project: Project, stealFocusIfAppInactive: Boolean)
}

@Remote("com.intellij.openapi.vfs.LocalFileSystem")
interface SchemaFileSystem {
    fun getInstance(): SchemaFileSystem

    fun refreshAndFindFileByPath(path: String): VirtualFile?
}

private data class SchemaState(val applicable: Boolean, val schemaFiles: List<String>)

private const val COMPLETION_ATTEMPTS = 3

private const val INVALID_PROJECT_TYPE = "libraryyy"

/** An empty line inside the object; completion is invoked with the caret parked on it. */
private const val CARET_LINE = "\n  \n"

/**
 * Properties that only Nx's own project.json schema describes. They are absent from both the
 * SchemaStore schema the IDE resolves and the schema nxls served before the fix, and the document
 * does not already carry them: a schema-driven completion omits keys that are already present.
 */
private val NX_ONLY_PROPERTIES = listOf("generators", "metadata", "release", "root")

private val PROJECT_JSON =
    "{" +
        CARET_LINE +
        """  "name": "schema-check",
  "projectType": "$INVALID_PROJECT_TYPE",
  "sourceRoot": "src",
  "implicitDependencies": ["ui"],
  "targets": {
    "hello": {
      "executor": "nx:run-commands",
      "cache": false,
      "options": { "command": "echo hello" }
    }
  }
}
"""

private fun Driver.refreshVfs(path: Path): VirtualFile =
    checkNotNull(
        utility<SchemaFileSystem>().getInstance().refreshAndFindFileByPath(path.toString())
    ) {
        "The IDE could not see $path"
    }

/**
 * `toFront()` is not enough on macOS when another application owns the focus, and completion is
 * disabled unless the editor has it, so bring the whole IDE forward first.
 */
private fun Driver.focusEditor(
    project: Project,
    frame: com.intellij.driver.sdk.ui.remote.Component,
    editorComponent: com.intellij.driver.sdk.ui.components.UiComponent,
) {
    withContext(OnDispatcher.EDT) {
        utility<SchemaProjectUtil>().focusProjectWindow(project, true)
        cast(frame, GraphIdeFrame::class).toFront()
    }
    Thread.sleep(1500)
    editorComponent.click()
    Thread.sleep(500)
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    val workspace = Path.of(project.getBasePath())
    check(workspace.fileName.toString() == "intellij-automation-fixture") {
        "Unexpected fixture: $workspace"
    }

    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "issue-1986-repro"
    val output =
        automationOutput().resolve("$label-${System.currentTimeMillis()}").createDirectories()

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

    // A fresh directory per run: the IDE keeps the document it loaded for a path it has already
    // opened, so reusing one path would show the previous run's content.
    val projectDir = workspace.resolve("$label-project")
    val projectJson = projectDir.resolve("project.json")
    try {
        projectDir.createDirectories()
        projectJson.writeText(PROJECT_JSON)
        val virtualFile = refreshVfs(projectJson)
        openFile("$label-project/project.json")
        Thread.sleep(3000)

        // Resolving a schema walks the PSI, so it needs a read action.
        val schemaState =
            withContext(OnDispatcher.DEFAULT, LockSemantics.READ_ACTION) {
                val schemaService = utility<SchemaServiceCompanion>().get(project)
                SchemaState(
                    applicable = schemaService.isApplicableToFile(virtualFile),
                    schemaFiles =
                        schemaService.getSchemaFilesForFile(virtualFile).map { it.getPath() },
                )
            }
        val applicable = schemaState.applicable
        val schemaFiles = schemaState.schemaFiles

        recordIde(label) {
            Thread.sleep(1500)
            val editor =
                checkNotNull(service<FileEditorManager>(project).getSelectedTextEditor()) {
                    "demo/project.json is not open in an editor"
                }
            val document = editor.getDocument()
            val text = document.getText()
            output.resolve("document.txt").writeText(text)
            val caretIndex = text.indexOf(CARET_LINE)
            check(caretIndex >= 0) {
                "The caret line is missing from ${editor.getVirtualFile().getPath()}:\n" +
                    text.take(300)
            }
            val caretOffset = caretIndex + CARET_LINE.length - 1
            // Completion is only enabled when the editor itself owns the data context, and the
            // window has to be in front for the click to land on it.
            val editorComponent = ui.x("//div[@class='EditorComponentImpl']")
            focusEditor(project, frame, editorComponent)
            withContext(OnDispatcher.EDT) { editor.getCaretModel().moveToOffset(caretOffset) }
            Thread.sleep(1000)

            // Read the diagnostics on the pristine document first: accepting or dismissing a
            // completion can edit the file, and a broken document reports parse errors instead.
            waitForCodeAnalysis(project, virtualFile, 3.minutes)
            val highlights =
                getHighlights(document, project).mapNotNull {
                    runCatching { it.getDescription() }.getOrNull()
                }
            val flagsInvalidProjectType =
                highlights.any { it.contains("library") && it.contains("application") }

            val lookupManager = utility<SchemaLookupManager>().getInstance(project)
            var completions: List<String> = emptyList()
            repeat(COMPLETION_ATTEMPTS) {
                if (completions.isNotEmpty()) {
                    return@repeat
                }
                invokeAction("CodeCompletion", component = editorComponent.component)
                val deadline = System.nanoTime() + 15.seconds.inWholeNanoseconds
                while (System.nanoTime() < deadline && completions.isEmpty()) {
                    completions =
                        runCatching {
                                lookupManager.getActiveLookup()?.getItems()?.map {
                                    it.getLookupString()
                                }
                            }
                            .getOrNull() ?: emptyList()
                    Thread.sleep(500)
                }
                if (completions.isEmpty()) {
                    ui.robot.pressAndReleaseKey(KeyEvent.VK_ESCAPE)
                    Thread.sleep(1000)
                    focusEditor(project, frame, editorComponent)
                    withContext(OnDispatcher.EDT) {
                        editor.getCaretModel().moveToOffset(caretOffset)
                    }
                    Thread.sleep(1000)
                }
            }
            Thread.sleep(2500)
            ui.robot.pressAndReleaseKey(KeyEvent.VK_ESCAPE)
            Thread.sleep(1000)

            // Lookup strings arrive quoted, and some entries carry a value template.
            val offered = completions.map { it.trim().removePrefix("\"").substringBefore("\"") }
            val nxCompletions = NX_ONLY_PROPERTIES.filter { offered.contains(it) }

            val report = buildString {
                appendLine("Issue #1986: project.json JSON schema in JetBrains IDEs")
                appendLine()
                appendLine("File: ${workspace.relativize(projectJson)}")
                appendLine("JsonSchemaService.isApplicableToFile: $applicable")
                appendLine(
                    "Schema the IDE resolves (unchanged by the fix): " +
                        "${schemaFiles.ifEmpty { listOf("<none>") }}"
                )
                appendLine()
                appendLine("Completion for a property name at the top level:")
                appendLine("  total items: ${completions.size}")
                appendLine(
                    "  Nx-only properties offered: ${nxCompletions.ifEmpty { listOf("<none>") }}"
                )
                appendLine("  offered: $offered")
                appendLine()
                appendLine(
                    "\"projectType\": \"$INVALID_PROJECT_TYPE\" is out of the schema's enum."
                )
                appendLine("  reported in the editor: $flagsInvalidProjectType")
                appendLine("  highlights: ${highlights.ifEmpty { listOf("<none>") }}")
            }
            println(report)
            output.resolve("result.txt").writeText(report)
            val resultFile = workspace.resolve("demo/$label-result.txt")
            resultFile.writeText(report)
            refreshVfs(resultFile)
            openFile("demo/$label-result.txt")
            Thread.sleep(4000)

            check(nxCompletions.size == NX_ONLY_PROPERTIES.size) {
                "Completion did not offer the properties from Nx's own schema.\n$report"
            }
            check(flagsInvalidProjectType) {
                "Nothing reported the out-of-enum projectType.\n$report"
            }
        }
    } finally {
        projectDir.toFile().deleteRecursively()
        runCatching {
            utility<SchemaFileSystem>().getInstance().refreshAndFindFileByPath(workspace.toString())
        }
    }
    println("Artifacts: $output")
}
