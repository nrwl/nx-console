package dev.nx.console.nxls

import com.intellij.lang.documentation.DocumentationMarkup.CONTENT_END
import com.intellij.lang.documentation.DocumentationMarkup.CONTENT_START
import com.intellij.lang.documentation.DocumentationProvider
import com.intellij.openapi.editor.Editor
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.util.startOffset
import dev.nx.console.nxls.managers.DocumentManager
import dev.nx.console.utils.DocumentUtils
import kotlinx.coroutines.runBlocking

internal class NxlsDocumentationProvider : DocumentationProvider {

    var editor: Editor? = null

    override fun generateDoc(element: PsiElement?, originalElement: PsiElement?): String? {
        if (element == null) return null
        val isNxFile: Boolean =
            try {
                DocumentUtils.isNxFile(element.containingFile.name)
            } catch (e: Throwable) {
                false
            }
        if (!isNxFile) {
            return null
        }

        val doc =
            runBlocking {
                try {
                    DocumentManager.getInstance(editor ?: return@runBlocking null)
                        .hover(element.startOffset)
                } catch (e: Throwable) {
                    null
                }
            }
                ?: return null

        // extract LSP Markdown format and convert links to html that intellij can understand
        val matches =
            Regex("\\[(.+)\\]\\((https:\\/\\/nx.dev\\/.*)\\)").matchEntire(doc)?.groupValues
                ?: return doc

        if (matches.size < 3) {
            return doc
        }

        val nxDevLinkText = matches[1]
        val nxDevLinkUrl = matches[2]

        if (nxDevLinkText.isEmpty() || nxDevLinkUrl.isEmpty()) {
            return doc
        }
        return "$CONTENT_START <a href='$nxDevLinkUrl'>$nxDevLinkText</a> $CONTENT_END"
    }

    override fun getCustomDocumentationElement(
        editor: Editor,
        file: PsiFile,
        contextElement: PsiElement?,
        targetOffset: Int,
    ): PsiElement? {
        return try {
            if (DocumentUtils.isNxFile(file.name)) {
                this.editor = editor
                contextElement
            } else {
                null
            }
        } catch (e: Throwable) {
            null
        }
    }
}
