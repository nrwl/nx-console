package dev.nx.console.automation

import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.sdk.FileEditorManager
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.ui.components.elements.JTreeUiComponent
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import kotlin.io.path.writeText
import kotlin.time.Duration.Companion.minutes

private const val PROVIDER_ID = "dev.nx.console.config-file-code-vision"
private const val PROJECT_JSON = "demo/project.json"
private const val EXPECTED_ENTRY = "Nx Targets: hello"

@Remote("com.intellij.openapi.editor.Editor")
interface CodeVisionEditor {
    fun getInlayModel(): CodeVisionInlayModel
}

@Remote("com.intellij.openapi.editor.InlayModel")
interface CodeVisionInlayModel {
    fun getBlockElementsInRange(startOffset: Int, endOffset: Int): List<CodeVisionInlay>

    fun getInlineElementsInRange(startOffset: Int, endOffset: Int): List<CodeVisionInlay>

    fun getAfterLineEndElementsInRange(startOffset: Int, endOffset: Int): List<CodeVisionInlay>
}

@Remote("com.intellij.openapi.editor.Inlay")
interface CodeVisionInlay {
    fun getUserData(key: CodeVisionDataKey): CodeVisionListDataRef?
}

@Remote("com.intellij.openapi.util.Key") interface CodeVisionDataKey

@Remote("com.intellij.codeInsight.codeVision.ui.model.CodeVisionListData")
interface CodeVisionListDataRef {
    fun getAnchoredLens(): List<CodeVisionEntryRef>
}

@Remote("com.intellij.codeInsight.codeVision.CodeVisionEntry")
interface CodeVisionEntryRef {
    fun getProviderId(): String

    fun getLongPresentation(): String
}

@Remote("com.intellij.codeInsight.codeVision.settings.CodeVisionSettings")
interface CodeVisionSettingsStatics {
    fun getInstance(): CodeVisionSettingsRef
}

@Remote("com.intellij.codeInsight.codeVision.settings.CodeVisionSettings")
interface CodeVisionSettingsRef {
    fun getCodeVisionEnabled(): Boolean

    fun isProviderEnabled(id: String): Boolean
}

@Remote("java.lang.Class")
interface CodeVisionClassStatics {
    fun forName(name: String): CodeVisionClass
}

@Remote("java.lang.Class")
interface CodeVisionClass {
    fun getField(name: String): CodeVisionKeyField
}

@Remote("java.lang.reflect.Field")
interface CodeVisionKeyField {
    fun get(target: CodeVisionDataKey?): CodeVisionDataKey
}

/**
 * Opens a project.json and checks that the IDE renders Nx Console's code vision entry in it, and
 * that the Nx Console tool window lists the fixture's projects. Both rely on default methods of
 * platform interfaces (CodeVisionProvider, ToolWindowFactory) that Nx Console does not override.
 * Expects a fixture whose demo project has a single target named hello.
 */
fun main() = withAutomationDriver {
    waitForProjectOpen(3.minutes)
    val project = getOpenProjects().single()
    val ide = getProductVersion()

    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "config-file-code-vision") {
        openToolWindow("Nx Console")
        val tree = ui.x("//div[@class='NxProjectsTree']", JTreeUiComponent::class.java)
        var projects = emptyList<String>()
        val treeDeadline = System.nanoTime() + 2.minutes.inWholeNanoseconds
        while (System.nanoTime() < treeDeadline && "demo" !in projects) {
            projects =
                runCatching {
                        tree.expandAll()
                        tree
                            .collectExpandedPaths()
                            .map { it.path }
                            .filter { it.size == 2 && it.first() == "Projects" }
                            .map { it[1] }
                    }
                    .getOrDefault(emptyList())
            Thread.sleep(1000)
        }

        openFile(PROJECT_JSON)
        val key =
            utility<CodeVisionClassStatics>()
                .forName("com.intellij.codeInsight.codeVision.ui.model.CodeVisionListData")
                .getField("KEY")
                .get(null)
        val settings = utility<CodeVisionSettingsStatics>().getInstance()
        val settingsLine =
            "code vision enabled: ${settings.getCodeVisionEnabled()}, " +
                "Nx provider enabled: ${settings.isProviderEnabled(PROVIDER_ID)}"
        var inlayCount = 0
        var lensError: String? = null
        var entries = emptyList<Pair<String, String>>()
        val lensDeadline = System.nanoTime() + 2.minutes.inWholeNanoseconds
        while (System.nanoTime() < lensDeadline && entries.none { it.first == PROVIDER_ID }) {
            entries =
                runCatching {
                        val editor =
                            checkNotNull(
                                service<FileEditorManager>(project).getSelectedTextEditor()
                            )
                        val length = editor.getDocument().getText().length
                        val model = cast(editor, CodeVisionEditor::class).getInlayModel()
                        val inlays =
                            model.getBlockElementsInRange(0, length) +
                                model.getInlineElementsInRange(0, length) +
                                model.getAfterLineEndElementsInRange(0, length)
                        inlayCount = inlays.size
                        inlays.flatMap { inlay ->
                            inlay.getUserData(key)?.getAnchoredLens().orEmpty().map {
                                it.getProviderId() to it.getLongPresentation()
                            }
                        }
                    }
                    .onFailure { lensError = it.toString() }
                    .getOrDefault(emptyList())
            Thread.sleep(1000)
        }
        Thread.sleep(3000)

        val nxEntries = entries.filter { it.first == PROVIDER_ID }.map { it.second }
        val passed = "demo" in projects && EXPECTED_ENTRY in nxEntries
        val report = buildString {
            appendLine("IDE: $ide")
            appendLine("Projects in tree: $projects")
            appendLine("Settings: $settingsLine")
            appendLine("Inlays in $PROJECT_JSON: $inlayCount")
            lensError?.let { appendLine("Last inlay read error: $it") }
            appendLine("Code vision entries in $PROJECT_JSON: $entries")
            appendLine("Expected Nx entry: $EXPECTED_ENTRY")
            appendLine("RESULT: ${if (passed) "PASS" else "FAIL"}")
        }
        automationOutput()
            .resolve("config-file-code-vision-${System.currentTimeMillis()}.txt")
            .writeText(report)
        println(report)
        check(passed) { "Nx Console code vision or tool window missing in $ide" }
    }
}
