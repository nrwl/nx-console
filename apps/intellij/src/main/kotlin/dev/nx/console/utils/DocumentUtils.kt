package dev.nx.console.utils

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.LogicalPosition
import com.intellij.openapi.util.TextRange
import com.intellij.openapi.util.text.StringUtil
import com.intellij.util.DocumentUtil

import org.eclipse.lsp4j.Position

private val log = logger<DocumentUtils>()

class DocumentUtils {
  companion object {
    fun offsetToLSPPos(editor: Editor, offset: Int): Position? {
      return computableReadAction {
        if (editor.isDisposed) {
          return@computableReadAction null
        }
        val doc = editor.document
        val line = doc.getLineNumber(offset)
        val lineStart = doc.getLineStartOffset(line)
        val lineTextBeforeOffset =
          doc.getText(TextRange.create(lineStart, offset))
        val tabs = StringUtil.countChars(lineTextBeforeOffset, '\t')
        val tabSize: Int = getTabSize(editor)
        val column = lineTextBeforeOffset.length - tabs * (tabSize - 1)
        Position(line, column)
      }
    }

    fun getTabSize(editor: Editor): Int {
      return computableReadAction { editor.settings.getTabSize(editor.project) }
    }

    fun LSPPosToOffset(editor: Editor?, pos: Position): Int {
      return computableReadAction {
        if (editor == null) {
          return@computableReadAction -1
        }
        if (editor.isDisposed) {
          return@computableReadAction -2
        }
        // lsp and intellij start lines/columns zero-based
        val doc = editor.document
        val line = Math.max(0, Math.min(pos.line, doc.lineCount - 1))
        val lineText = doc.getText(DocumentUtil.getLineTextRange(doc, line))
        val positionInLine = Math.max(0, Math.min(lineText.length, pos.character))
        val tabs =
          StringUtil.countChars(lineText, '\t', 0, positionInLine, false)
        val tabSize = getTabSize(editor)
        val column = positionInLine + tabs * (tabSize - 1)
        val offset = editor.logicalPositionToOffset(LogicalPosition(line, column))
        if (pos.character >= lineText.length) {
          log.debug(
            String.format(
              "LSPPOS outofbounds: %s, line : %s, column : %d, offset : %d", pos,
              lineText, column, offset
            )
          )
        }
        val docLength = doc.textLength
        if (offset > docLength) {
          log.debug(String.format("Offset greater than text length : %d > %d", offset, docLength))
        }
        offset.coerceAtLeast(0).coerceAtMost(docLength)
      }
    }
  }

}
