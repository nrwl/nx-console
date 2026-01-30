package dev.nx.console.logs

import com.intellij.openapi.application.EDT
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.EditorKind
import com.intellij.openapi.editor.ex.EditorEx
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.UserDataHolderBase
import dev.nx.console.utils.NxConsoleLogListener
import dev.nx.console.utils.NxConsoleLogger
import dev.nx.console.utils.writeAction
import java.beans.PropertyChangeListener
import javax.swing.JComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class NxLogsEditor(private val project: Project, private val file: NxLogsVirtualFile) :
    FileEditor, UserDataHolderBase() {

    private val document = EditorFactory.getInstance().createDocument(file.refreshContent())
    private val editor: EditorEx =
        EditorFactory.getInstance().createViewer(document, project, EditorKind.MAIN_EDITOR)
            as EditorEx

    private val scope = CoroutineScope(Dispatchers.Default)

    private val logListener = NxConsoleLogListener { refreshContent() }

    init {
        editor.settings.apply {
            isLineNumbersShown = true
            isCaretRowShown = false
            isFoldingOutlineShown = false
            isUseSoftWraps = true
        }

        NxConsoleLogger.getInstance().addListener(logListener)
    }

    private fun refreshContent() {
        scope.launch(Dispatchers.EDT) {
            if (project.isDisposed) return@launch

            val content = file.refreshContent()
            val wasAtEnd = isScrolledToEnd()

            writeAction {
                document.setReadOnly(false)
                document.setText(content)
                document.setReadOnly(true)
            }

            if (wasAtEnd) {
                scrollToEnd()
            }
        }
    }

    private fun isScrolledToEnd(): Boolean {
        val scrollOffset =
            editor.scrollingModel.visibleArea.y + editor.scrollingModel.visibleArea.height
        val contentHeight = editor.contentComponent.height
        return scrollOffset >= contentHeight - 50
    }

    private fun scrollToEnd() {
        val lineCount = document.lineCount
        if (lineCount > 0) {
            editor.caretModel.moveToOffset(document.textLength)
            editor.scrollingModel.scrollToCaret(com.intellij.openapi.editor.ScrollType.MAKE_VISIBLE)
        }
    }

    override fun getComponent(): JComponent = editor.component

    override fun getPreferredFocusedComponent(): JComponent = editor.contentComponent

    override fun getName(): String = "Nx Logs"

    override fun setState(state: FileEditorState) {}

    override fun isModified(): Boolean = false

    override fun isValid(): Boolean = true

    override fun addPropertyChangeListener(listener: PropertyChangeListener) {}

    override fun removePropertyChangeListener(listener: PropertyChangeListener) {}

    override fun getFile() = file

    override fun dispose() {
        NxConsoleLogger.getInstance().removeListener(logListener)
        scope.cancel()
        EditorFactory.getInstance().releaseEditor(editor)
    }
}
