package dev.nx.console.completion

import com.intellij.codeInsight.completion.InsertionContext
import com.intellij.codeInsight.lookup.AutoCompletionPolicy
import com.intellij.codeInsight.lookup.LookupElement
import com.intellij.codeInsight.lookup.LookupElementBuilder
import com.intellij.icons.AllIcons
import com.intellij.openapi.command.CommandProcessor
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.editor.Document
import com.intellij.openapi.fileEditor.FileDocumentManager
import dev.nx.console.nxls.managers.DocumentManager
import dev.nx.console.utils.DocumentUtils
import dev.nx.console.utils.writeAction
import javax.swing.Icon
import org.apache.commons.lang3.StringUtils
import org.eclipse.lsp4j.CompletionItem
import org.eclipse.lsp4j.CompletionItemKind
import org.eclipse.lsp4j.TextEdit

interface CreateLookupElements {}

private val log = logger<CreateLookupElements>()

private val snippet = Regex("(\\$\\{\\d+:?([^{^}]*)}|\\$\\d+)")

fun createLookupItem(documentManager: DocumentManager, item: CompletionItem): LookupElement? {
    val detail = item.detail
    val insertText = item.insertText
    val kind = item.kind
    val label = item.label
    val textEdit = item.textEdit.left
    val presentableText = if (StringUtils.isNotEmpty(label)) label else insertText ?: ""
    val tailText = detail ?: ""
    val lookupString: String = convertPlaceHolders(textEdit.newText)

    var lookupElementBuilder =
        LookupElementBuilder.create(lookupString)
            .withInsertHandler { context, _ ->
                applyInitialTextEdit(documentManager, item, context)
                context.commitDocument()
            }
            .withIcon(getCompletionIcon(kind))

    if (kind == CompletionItemKind.Keyword) {
        lookupElementBuilder = lookupElementBuilder.withBoldness(true)
    }

    return lookupElementBuilder
        .withPresentableText(presentableText)
        .withTypeText(tailText, true)
        .withAutoCompletionPolicy(AutoCompletionPolicy.SETTINGS_DEPENDENT)
}

fun applyInitialTextEdit(
    documentManager: DocumentManager,
    item: CompletionItem,
    context: InsertionContext,
) {
    // remove intellij edit, server is controlling insertion
    writeAction {
        val runnable = Runnable {
            context.document.deleteString(context.startOffset, context.selectionEndOffset)
        }
        CommandProcessor.getInstance()
            .executeCommand(
                context.project,
                runnable,
                "Removing Intellij Completion",
                "LSPPlugin",
                context.document
            )
    }
    context.commitDocument()
    applyEdit(documentManager, item.textEdit.left)
}

private fun convertPlaceHolders(insertText: String): String {
    return insertText.replace(snippet, "")
}

private fun applyEdit(
    documentManager: DocumentManager,
    textEdit: TextEdit,
): Boolean {
    val runnable = getEditsRunnable(documentManager, textEdit)

    writeAction {
        if (runnable != null) {
            CommandProcessor.getInstance()
                .executeCommand(
                    documentManager.editor.project,
                    runnable,
                    "text edit",
                    "NxConsole",
                    documentManager.editor.document
                )
        }
    }
    return runnable != null
}

private fun getEditsRunnable(documentManager: DocumentManager, textEdit: TextEdit): Runnable? {
    if (documentManager.editor.isDisposed) {
        log.warn("Text edits couldn't be applied as the editor is already disposed.")
        return null
    }

    val document: Document = documentManager.editor.document
    if (!document.isWritable) {
        log.warn("Document is not writable")
        return null
    }
    return Runnable {
        val editor = documentManager.editor

        val text = convertPlaceHolders(textEdit.newText)
        val range = textEdit.range
        val start = DocumentUtils.LSPPosToOffset(editor, range.start)
        val end = DocumentUtils.LSPPosToOffset(editor, range.end)

        if (end >= 0) {
            if (end - start <= 0) {
                document.insertString(start, text)
            } else {
                val replaceEnd = if (end - start == 2) end else end - 1
                document.replaceString(start, replaceEnd, text)
            }
        } else if (start == 0) {
            document.setText(text)
        } else if (start > 0) {
            document.insertString(start, text)
        }

        val snippetLocation = snippet.find(textEdit.newText)?.range?.start ?: text.length
        editor.caretModel.moveToOffset(start + snippetLocation)

        FileDocumentManager.getInstance().saveDocument(editor.document)
    }
}

private fun getCompletionIcon(kind: CompletionItemKind?): Icon? {
    return when (kind) {
        CompletionItemKind.Class -> AllIcons.Nodes.Class
        CompletionItemKind.Enum -> AllIcons.Nodes.Enum
        CompletionItemKind.Field -> AllIcons.Nodes.Field
        CompletionItemKind.File -> AllIcons.FileTypes.Any_type
        CompletionItemKind.Function -> AllIcons.Nodes.Function
        CompletionItemKind.Interface -> AllIcons.Nodes.Interface
        CompletionItemKind.Keyword -> AllIcons.Nodes.UpLevel
        CompletionItemKind.Method -> AllIcons.Nodes.Method
        CompletionItemKind.Module -> AllIcons.Nodes.Module
        CompletionItemKind.Property -> AllIcons.Nodes.Property
        CompletionItemKind.Reference -> AllIcons.Nodes.MethodReference
        CompletionItemKind.Snippet -> AllIcons.Nodes.Static
        CompletionItemKind.Text -> AllIcons.FileTypes.Text
        CompletionItemKind.Unit -> AllIcons.Nodes.Artifact
        CompletionItemKind.Variable -> AllIcons.Nodes.Variable
        CompletionItemKind.Value -> AllIcons.Nodes.Controller
        else -> null
    }
}
