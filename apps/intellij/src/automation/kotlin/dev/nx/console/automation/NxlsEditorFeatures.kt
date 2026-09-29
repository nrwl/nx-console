package dev.nx.console.automation

import com.intellij.driver.client.Driver
import com.intellij.driver.client.Remote
import com.intellij.driver.client.service
import com.intellij.driver.client.utility
import com.intellij.driver.model.OnDispatcher
import com.intellij.driver.sdk.Document
import com.intellij.driver.sdk.Editor
import com.intellij.driver.sdk.Project
import com.intellij.driver.sdk.VirtualFile
import com.intellij.driver.sdk.getOpenProjects
import com.intellij.driver.sdk.invokeAction
import com.intellij.driver.sdk.openFile
import com.intellij.driver.sdk.ui.remote.Component
import com.intellij.driver.sdk.ui.ui
import com.intellij.driver.sdk.waitForProjectOpen
import java.nio.file.Path
import kotlin.io.path.readText
import kotlin.io.path.writeText
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

@Remote("com.intellij.ui.AppIcon")
interface NxlsAppIcon {
    fun getInstance(): NxlsAppIcon

    fun requestFocus()
}

@Remote("com.intellij.openapi.editor.Editor")
interface NxlsEditor : Editor {
    fun getContentComponent(): Component

    fun isDisposed(): Boolean
}

@Remote("com.intellij.openapi.fileEditor.FileEditorManager")
interface NxlsEditors {
    fun getSelectedTextEditor(): NxlsEditor?

    fun getSelectedEditor(): NxlsPreviewEditor?

    fun isFileOpen(file: VirtualFile): Boolean
}

@Remote("com.intellij.openapi.fileEditor.FileDocumentManager")
interface NxlsDocuments {
    fun isDocumentUnsaved(document: Document): Boolean

    fun getFile(document: Document): VirtualFile?

    fun saveDocument(document: Document)
}

@Remote("com.intellij.ide.SaveAndSyncHandler")
interface NxlsAutoSave {
    fun disableAutoSave(): NxlsAutoSaveToken
}

@Remote("com.intellij.openapi.application.AccessToken")
interface NxlsAutoSaveToken {
    fun finish()
}

@Remote("com.intellij.codeInsight.lookup.LookupManager")
interface NxlsLookups {
    fun getActiveLookup(): NxlsLookup?
}

@Remote("com.intellij.codeInsight.lookup.impl.LookupImpl")
interface NxlsLookup {
    fun getItems(): List<NxlsLookupItem>

    fun isCalculating(): Boolean

    fun setCurrentItem(item: NxlsLookupItem)

    fun hideLookup(explicitly: Boolean)
}

@Remote("com.intellij.codeInsight.lookup.LookupElement")
interface NxlsLookupItem {
    fun getLookupString(): String

    fun getObject(): NxlsCompletionObject
}

@Remote("com.intellij.platform.lsp.impl.completion.LspCompletionObject")
interface NxlsCompletionObject {
    fun getCompletionItem(): NxlsCompletionItem

    fun getLspServer(): NxlsPlatformServer
}

@Remote("com.intellij.platform.lsp.impl.LspServerImpl")
interface NxlsPlatformServer {
    fun getDescriptor(): NxlsDescriptor

    fun `getDocumentLinkInfos$intellij_platform_lsp_impl`(file: VirtualFile): List<NxlsCachedLink>
}

@Remote("dev.nx.console.nxls.NxlsServerDescriptor", plugin = "dev.nx.console")
interface NxlsDescriptor {
    fun getGeneration(): Long
}

@Remote("com.intellij.platform.lsp.impl.highlightingCommon.LspCachedHighlighting")
interface NxlsCachedLink {
    fun getHighlightingInfo(): NxlsDocumentLink
}

@Remote("com.intellij.platform.lsp.impl.highlighting.LspDocumentLink")
interface NxlsDocumentLink {
    fun getTargetUri(): String?
}

@Remote("org.eclipse.lsp4j.CompletionItem")
interface NxlsCompletionItem {
    fun getLabel(): String

    fun getInsertTextFormat(): NxlsInsertTextFormat?

    fun getInsertText(): String?

    fun getTextEdit(): NxlsTextEditEither?
}

@Remote("org.eclipse.lsp4j.InsertTextFormat")
interface NxlsInsertTextFormat {
    fun getValue(): Int
}

@Remote("org.eclipse.lsp4j.jsonrpc.messages.Either")
interface NxlsTextEditEither {
    fun getLeft(): NxlsTextEdit?
}

@Remote("org.eclipse.lsp4j.TextEdit")
interface NxlsTextEdit {
    fun getNewText(): String
}

@Remote("com.intellij.codeInsight.template.impl.TemplateManagerImpl")
interface NxlsTemplates {
    fun getTemplateState(editor: Editor): NxlsTemplateState?
}

@Remote("com.intellij.codeInsight.template.impl.TemplateState")
interface NxlsTemplateState {
    fun isFinished(): Boolean

    fun getCurrentVariableNumber(): Int

    fun getCurrentVariableRange(): NxlsTextRange?
}

@Remote("com.intellij.openapi.util.TextRange")
interface NxlsTextRange {
    fun getStartOffset(): Int
}

@Remote("javax.swing.JEditorPane")
interface NxlsDocumentationPane {
    fun getText(): String
}

@Remote("com.intellij.openapi.ui.popup.util.PopupUtil")
interface NxlsPopupUtil {
    fun getPopupContainerFor(component: Component): NxlsPopup?
}

@Remote("com.intellij.openapi.ui.popup.JBPopup")
interface NxlsPopup {
    fun cancel()
}

internal fun nxlsWait(
    timeout: Duration = 60.seconds,
    message: () -> String,
    condition: () -> Boolean,
) {
    val deadline = System.nanoTime() + timeout.inWholeNanoseconds
    while (!condition()) {
        check(System.nanoTime() < deadline, message)
        Thread.sleep(250)
    }
}

internal fun Driver.nxlsFrame(): Component =
    ui.x("//div[@class='IdeFrameImpl']").component.also {
        withContext(OnDispatcher.EDT) {
            cast(it, GraphIdeFrame::class).apply {
                setExtendedState(0)
                toFront()
                getBalloonLayout().closeAll()
            }
            utility<NxlsAppIcon>().getInstance().requestFocus()
        }
    }

internal fun Driver.nxlsRunning(project: Project) {
    nxlsWait(5.minutes, { "Nx language server did not reach Running" }) {
        service<EditorFreezeNxlsService>(project).isStarted()
    }
}

internal fun Driver.nxlsEditor(project: Project): NxlsEditor =
    withContext(OnDispatcher.EDT) {
        checkNotNull(service<NxlsEditors>(project).getSelectedTextEditor()) {
            "No text editor selected"
        }
    }

internal fun Driver.nxlsText(editor: NxlsEditor): String =
    withContext(OnDispatcher.EDT) { editor.getDocument().getText() }

internal fun Driver.nxlsReplace(editor: NxlsEditor, text: String, offset: Int) {
    withWriteAction { editor.getDocument().setText(text) }
    withContext(OnDispatcher.EDT) { editor.getCaretModel().moveToOffset(offset) }
}

internal fun Driver.nxlsFocusEditor(editor: NxlsEditor) {
    withContext(OnDispatcher.EDT) {
        // Bringing the frame forward does not activate the application on macOS.
        utility<NxlsAppIcon>().getInstance().requestFocus()
        editor.getContentComponent().requestFocus()
    }
    nxlsWait(message = { "Editor did not gain focus" }) {
        withContext(OnDispatcher.EDT) { editor.getContentComponent().isFocusOwner() }
    }
}

internal fun Driver.nxlsFinishTemplate(editor: NxlsEditor, cancel: Boolean = false) {
    nxlsWait(message = { "Live template did not finish" }) {
        val active =
            withContext(OnDispatcher.EDT) {
                utility<NxlsTemplates>().getTemplateState(editor)?.isFinished() == false
            }
        if (active) {
            invokeAction(
                if (cancel) "EditorEscape" else "NextTemplateVariable",
                component = editor.getContentComponent(),
            )
        }
        !active
    }
}

internal fun Driver.nxlsHideLookup(project: Project) {
    withContext(OnDispatcher.EDT) {
        service<NxlsLookups>(project).getActiveLookup()?.hideLookup(true)
    }
}

internal fun Driver.nxlsCompletion(
    project: Project,
    editor: NxlsEditor,
    expected: String,
): Pair<NxlsLookup, List<NxlsLookupItem>> {
    nxlsHideLookup(project)
    nxlsFocusEditor(editor)
    invokeAction("CodeCompletion", component = editor.getContentComponent())
    var result: Pair<NxlsLookup, List<NxlsLookupItem>>? = null
    var labels = emptyList<String>()
    var lookupState = "absent"
    nxlsWait(
        message = { "No LSP completion '$expected'; lookup=$lookupState; LSP labels: $labels" }
    ) {
        withContext(OnDispatcher.EDT) {
            val lookup = service<NxlsLookups>(project).getActiveLookup()
            lookupState =
                if (lookup == null) "absent"
                else "${lookup.getItems().size} items, calculating=${lookup.isCalculating()}"
            if (lookup == null || lookup.isCalculating()) return@withContext false
            // JSON schema completion can fill the same lookup even when nxls is disconnected.
            val items =
                lookup.getItems().filter {
                    runCatching { it.getObject().getCompletionItem().getLabel() }.isSuccess
                }
            labels = items.map { it.getObject().getCompletionItem().getLabel() }
            if (expected !in labels) return@withContext false
            result = lookup to items
            true
        }
    }
    return checkNotNull(result)
}

internal fun Driver.nxlsDocumentation(
    editor: NxlsEditor,
    token: String,
    expected: String,
    link: Boolean = false,
): String {
    val offset = nxlsText(editor).indexOf("\"$token\"")
    check(offset >= 0) { "Missing documentation token '$token'" }
    withContext(OnDispatcher.EDT) { editor.getCaretModel().moveToOffset(offset + 2) }
    nxlsFocusEditor(editor)
    // Quick Documentation uses the platform's LSP hover provider without native pointer input.
    invokeAction("QuickJavaDoc", component = editor.getContentComponent())
    var html = ""
    var pane: Component? = null
    nxlsWait(message = { "No documentation for '$token' containing '$expected'; HTML: $html" }) {
        ui.xx("//div[@class='DocumentationHintEditorPane']").list().any {
            val candidate =
                withContext(OnDispatcher.EDT) {
                    cast(it.component, NxlsDocumentationPane::class).getText()
                }
            if (!candidate.contains(expected, ignoreCase = true)) return@any false
            html = candidate
            pane = it.component
            true
        }
    }
    try {
        check(html.replace(Regex("<[^>]+>"), "").isNotBlank()) { "Empty documentation popup" }
        if (link) {
            check(
                Regex("<a\\b[^>]*href=[\"']https://nx\\.dev/[^\"']+[\"']", RegexOption.IGNORE_CASE)
                    .containsMatchIn(html)
            ) {
                "nx.dev did not render as an HTML link: $html"
            }
            check(!html.contains("](https://nx.dev/")) { "Raw Markdown in documentation: $html" }
        }
        return html
    } finally {
        withContext(OnDispatcher.EDT) {
            utility<NxlsPopupUtil>().getPopupContainerFor(checkNotNull(pane))?.cancel()
        }
    }
}

internal data class NxlsConfigCase(
    val path: String,
    val buffer: String,
    val key: String,
    val nextKey: String,
    val hover: String,
    val documentation: String,
)

// A marker leaves completion at a key position without depending on fixture formatting.
internal val nxlsConfigCases =
    listOf(
        NxlsConfigCase(
            "nx.json",
            """{
  "analytics": false,
  "namedInputs": {"default": ["{projectRoot}/**/*"]},
  |
}""",
            "targetDefaults",
            "plugins",
            "namedInputs",
            "input",
        ),
        NxlsConfigCase(
            "demo/project.json",
            """{
  "name": "demo",
  "targets": {"hello": {"executor": "nx:run-commands", "inputs": ["default"], "options": {"command": "node -e 0"}}},
  |
}""",
            "tags",
            "implicitDependencies",
            "command",
            "command",
        ),
        NxlsConfigCase(
            "package.json",
            """{
  "name": "nxls-automation-fixture",
  "nx": {
    "targets": {"hello": {"executor": "nx:run-commands", "options": {"command": "node -e 0"}}},
    |
  }
}""",
            "tags",
            "implicitDependencies",
            "command",
            "command",
        ),
    )

internal fun Driver.nxlsPrepareCase(editor: NxlsEditor, case: NxlsConfigCase) {
    nxlsReplace(editor, case.buffer.replace("|", ""), case.buffer.indexOf('|'))
}

private fun Driver.checkSnippet(
    project: Project,
    editor: NxlsEditor,
    case: NxlsConfigCase,
    report: StringBuilder,
): NxlsPlatformServer {
    val document = editor.getDocument()
    val disk = Path.of(checkNotNull(service<NxlsDocuments>().getFile(document)).getPath())
    val diskBefore = disk.readText()
    nxlsPrepareCase(editor, case)
    val (lookup, items) = nxlsCompletion(project, editor, case.key)
    val item = items.first { it.getObject().getCompletionItem().getLabel() == case.key }
    val payload = item.getObject().getCompletionItem()
    val snippet =
        payload.getTextEdit()?.getLeft()?.getNewText() ?: payload.getInsertText().orEmpty()
    check(payload.getInsertTextFormat()?.getValue() == 2) {
        "${case.path}: ${case.key} is not InsertTextFormat.Snippet"
    }
    check(Regex("\\$(?:[1-9]|\\{[1-9])").containsMatchIn(snippet)) {
        "Snippet has no numbered tab stop: $snippet"
    }
    val server = item.getObject().getLspServer()
    withContext(OnDispatcher.EDT) { lookup.setCurrentItem(item) }
    invokeAction("EditorChooseLookupItem", component = editor.getContentComponent())
    nxlsWait(message = { "Snippet did not insert ${case.key}" }) {
        nxlsText(editor).contains("\"${case.key}\"")
    }
    val inserted = nxlsText(editor)
    check(!inserted.contains("\${") && !inserted.contains("\$0")) {
        "Literal snippet syntax in ${case.path}: $inserted"
    }
    withContext(OnDispatcher.EDT) {
        val template =
            checkNotNull(utility<NxlsTemplates>().getTemplateState(editor)) {
                "Snippet created no live template"
            }
        check(
            !template.isFinished() &&
                template.getCurrentVariableNumber() >= 0 &&
                template.getCurrentVariableRange() != null
        ) {
            "Snippet created no active tab stop"
        }
        check(service<NxlsDocuments>().isDocumentUnsaved(document)) {
            "Completion force-saved ${case.path}"
        }
    }
    nxlsFinishTemplate(editor)
    check(disk.readText() == diskBefore) { "Completion changed ${case.path} on disk" }
    val after = nxlsText(editor)
    // Probe the same object again: the server must omit the property just inserted, even on disk it
    // is absent.
    val closing =
        if (case.path == "package.json") after.lastIndexOf('}', after.lastIndexOf('}') - 1)
        else after.lastIndexOf('}')
    val followUp = after.substring(0, closing).trimEnd() + ",\n  \n" + after.substring(closing)
    nxlsReplace(editor, followUp, followUp.indexOf("\n  \n") + 3)
    val (_, updated) = nxlsCompletion(project, editor, case.nextKey)
    val labels = updated.map { it.getObject().getCompletionItem().getLabel() }
    check(case.key !in labels) { "Server still offers existing property '${case.key}': $labels" }
    check(service<NxlsDocuments>().isDocumentUnsaved(document) && disk.readText() == diskBefore) {
        "Follow-up completion relied on a save"
    }
    nxlsHideLookup(project)
    report.appendLine(
        "${case.path}: LSP snippet=$snippet; active tab stop, unsaved insert, updated lookup=$labels"
    )
    return server
}

private fun Driver.checkNavigation(
    project: Project,
    editor: NxlsEditor,
    server: NxlsPlatformServer,
    report: StringBuilder,
) {
    val file = checkNotNull(service<NxlsDocuments>().getFile(editor.getDocument()))
    var links = emptyList<String>()
    nxlsWait(message = { "No platform document link to nx.json; links=$links" }) {
        links = withReadAction {
            server.`getDocumentLinkInfos$intellij_platform_lsp_impl`(file).mapNotNull {
                it.getHighlightingInfo().getTargetUri()
            }
        }
        links.any { it.contains("/nx.json#") }
    }
    withContext(OnDispatcher.EDT) {
        editor.getCaretModel().moveToOffset(nxlsText(editor).indexOf("\"default\"") + 2)
    }
    invokeAction("GotoDeclaration", component = editor.getContentComponent())
    nxlsWait(message = { "Document link did not navigate to nx.json" }) {
        service<NxlsDocuments>()
            .getFile(nxlsEditor(project).getDocument())
            ?.getPath()
            ?.endsWith("/nx.json") == true
    }
    val destination = nxlsEditor(project)
    var line = -1
    nxlsWait(message = { "Document link opened wrong line: ${line + 1}; $links" }) {
        line =
            withContext(OnDispatcher.EDT) {
                destination.getDocument().getLineNumber(destination.getCaretModel().getOffset())
            }
        links.any { it.endsWith("#${line + 1}") }
    }
    openFile("demo/project.json")
    withContext(OnDispatcher.EDT) {
        editor.getCaretModel().moveToOffset(nxlsText(editor).indexOf("nx:run-commands") + 3)
    }
    invokeAction("GotoDeclaration", component = editor.getContentComponent())
    nxlsWait(message = { "Definition did not open the nx:run-commands implementation" }) {
        service<NxlsDocuments>().getFile(nxlsEditor(project).getDocument())?.getPath()?.let {
            it.contains("/nx/") && it.endsWith("/run-commands/run-commands.impl.js")
        } == true
    }
    report.appendLine(
        "Document links: $links; resolved nx.json line ${line + 1}; definition opened run-commands.impl.js"
    )
}

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    val project = getOpenProjects().single()
    nxlsFrame()
    val report = StringBuilder()
    val label = System.getenv("NX_AUTOMATION_LABEL") ?: "nxls-editor-features"
    recordIde(label) {
        val autoSave = service<NxlsAutoSave>().disableAutoSave()
        try {
            for (case in nxlsConfigCases) {
                openFile(case.path)
                nxlsRunning(project)
                val editor = nxlsEditor(project)
                val original = nxlsText(editor)
                check(!service<NxlsDocuments>().isDocumentUnsaved(editor.getDocument())) {
                    "Save ${case.path} before running"
                }
                try {
                    val server = checkSnippet(project, editor, case, report)
                    report.appendLine(nxlsDocumentation(editor, case.hover, case.documentation))
                    if (case.path != "nx.json")
                        report.appendLine(
                            nxlsDocumentation(editor, "nx:run-commands", "nx.dev", link = true)
                        )
                    if (case.path == "demo/project.json")
                        checkNavigation(project, editor, server, report)
                } finally {
                    nxlsHideLookup(project)
                    nxlsFinishTemplate(editor, cancel = true)
                    nxlsReplace(editor, original, 0)
                    withWriteAction { service<NxlsDocuments>().saveDocument(editor.getDocument()) }
                }
            }
        } finally {
            autoSave.finish()
            automationOutput()
                .resolve("$label-${System.currentTimeMillis()}.txt")
                .writeText(report.toString())
        }
    }
}
