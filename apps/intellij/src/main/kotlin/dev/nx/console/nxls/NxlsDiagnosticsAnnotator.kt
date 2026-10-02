package dev.nx.console.nxls

import com.intellij.lang.annotation.AnnotationHolder
import com.intellij.lang.annotation.ExternalAnnotator
import com.intellij.lang.annotation.HighlightSeverity
import com.intellij.openapi.editor.Document
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiFile
import dev.nx.console.utils.DocumentUtils
import org.eclipse.lsp4j.Diagnostic
import org.eclipse.lsp4j.DiagnosticSeverity
import org.eclipse.lsp4j.Position

class NxlsDiagnosticsAnnotator : ExternalAnnotator<List<Diagnostic>, List<Diagnostic>>() {

    override fun collectInformation(file: PsiFile): List<Diagnostic>? {
        if (!DocumentUtils.isNxFile(file.name)) {
            return null
        }
        val virtualFile = file.virtualFile ?: return null
        return NxlsDiagnosticsService.getInstance(file.project)
            .diagnosticsFor(virtualFile)
            .ifEmpty { null }
    }

    override fun doAnnotate(collectedInfo: List<Diagnostic>?): List<Diagnostic>? = collectedInfo

    override fun apply(
        file: PsiFile,
        annotationResult: List<Diagnostic>?,
        holder: AnnotationHolder,
    ) {
        if (annotationResult.isNullOrEmpty()) {
            return
        }
        val document = PsiDocumentManager.getInstance(file.project).getDocument(file) ?: return
        annotationResult.forEach { diagnostic ->
            val range = diagnostic.range.toTextRange(document) ?: return@forEach
            holder
                .newAnnotation(severityOf(diagnostic.severity), diagnostic.message)
                .range(range)
                .create()
        }
    }

    private fun severityOf(severity: DiagnosticSeverity?): HighlightSeverity =
        when (severity) {
            DiagnosticSeverity.Error -> HighlightSeverity.ERROR
            DiagnosticSeverity.Information,
            DiagnosticSeverity.Hint -> HighlightSeverity.INFORMATION
            else -> HighlightSeverity.WARNING
        }
}

private fun org.eclipse.lsp4j.Range.toTextRange(document: Document): TextRange? {
    val start = position(document, start)
    val end = position(document, end)
    // A zero-width range would not be visible, so fall back to highlighting to the end of the line.
    if (end > start) {
        return TextRange(start, end)
    }
    val lineEnd = document.getLineEndOffset(document.getLineNumber(start))
    return if (lineEnd > start) TextRange(start, lineEnd) else null
}

private fun position(document: Document, position: Position): Int {
    val line = position.line.coerceIn(0, (document.lineCount - 1).coerceAtLeast(0))
    val lineStart = document.getLineStartOffset(line)
    val lineEnd = document.getLineEndOffset(line)
    return (lineStart + position.character).coerceIn(lineStart, lineEnd)
}
