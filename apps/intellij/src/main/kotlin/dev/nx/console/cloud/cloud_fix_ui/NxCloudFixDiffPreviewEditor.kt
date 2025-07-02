package dev.nx.console.cloud.cloud_fix_ui

import com.intellij.diff.util.FileEditorBase
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.components.JBTextArea
import java.awt.BorderLayout
import java.awt.Font
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.SwingConstants

class NxCloudFixDiffPreviewEditor(
    private val project: Project,
    private val nxCloudFixFile: NxCloudFixFile
) : FileEditorBase() {

    private val component = JPanel(BorderLayout())
    private var currentDiff: String? = null

    init {
        showPlaceholder()
    }

    override fun getComponent(): JComponent = component

    override fun getFile(): VirtualFile = nxCloudFixFile

    override fun getName(): String = "Diff"

    override fun getPreferredFocusedComponent(): JComponent? = component

    fun updateDiff(gitDiff: String?) {
        currentDiff = gitDiff
        if (gitDiff != null && gitDiff.isNotBlank()) {
            showGitDiff(gitDiff)
        } else {
            showPlaceholder()
        }
    }

    private fun showGitDiff(gitDiff: String) {
        component.removeAll()
        
        // For now, show raw diff in a text area
        // In commit 8, this will be replaced with proper IntelliJ diff viewer
        val textArea = JBTextArea(gitDiff)
        textArea.isEditable = false
        textArea.font = Font(Font.MONOSPACED, Font.PLAIN, 12)
        
        val scrollPane = JBScrollPane(textArea)
        component.add(scrollPane, BorderLayout.CENTER)
        
        component.revalidate()
        component.repaint()
    }

    private fun showPlaceholder() {
        component.removeAll()
        component.add(
            JBLabel("Git diff will appear here when an AI fix is available", SwingConstants.CENTER),
            BorderLayout.CENTER
        )
        component.revalidate()
        component.repaint()
    }
}