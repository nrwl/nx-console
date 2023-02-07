package dev.nx.console.providers

import com.intellij.lang.documentation.DocumentationProvider
import com.intellij.openapi.editor.Editor
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.refactoring.suggested.startOffset
import dev.nx.console.nxls.managers.DocumentManager
import dev.nx.console.utils.DocumentUtils
import kotlinx.coroutines.runBlocking

class NxlsDocumentationProvider : DocumentationProvider {

    var editor: Editor? = null

    override fun generateDoc(element: PsiElement?, originalElement: PsiElement?): String? {
        if (element == null) return null
        if (!DocumentUtils.isNxFile(element.containingFile.name)) {
            return null
        }

        return runBlocking {
            DocumentManager.getInstance(editor ?: return@runBlocking null)
                .hover(element.startOffset)
        }
    }

    override fun getCustomDocumentationElement(
        editor: Editor,
        file: PsiFile,
        contextElement: PsiElement?,
        targetOffset: Int
    ): PsiElement? {
        return if (DocumentUtils.isNxFile(file.name)) {
            this.editor = editor
            contextElement
        } else {
            null
        }
    }
}
