package dev.nx.console.utils

import com.intellij.openapi.editor.Editor
import com.intellij.openapi.util.TextRange
import com.intellij.openapi.util.text.StringUtil
import dev.nx.console.utils.ApplicationUtils.Companion.computableReadAction
import org.eclipse.lsp4j.Position

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
  }

}
