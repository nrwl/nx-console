package dev.nx.console.cloud.cloud_fix_ui

import com.intellij.diff.util.FileEditorBase
import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.JBSplitter
import java.awt.BorderLayout
import javax.swing.JComponent
import javax.swing.JPanel

class NxCloudFixEditorWithPreview(
    private val project: Project,
    file: VirtualFile
) : FileEditorBase(), DumbAware {

    private val panel = JPanel(BorderLayout())
    private val toolbar = createToolbar()
    private val splitter = JBSplitter(false, 0.6f) // 60% webview, 40% diff
    
    private val webviewEditor = NxCloudFixWebviewEditor(project, file as NxCloudFixFile)
    private val diffPreviewEditor = NxCloudFixDiffPreviewEditor(project, file as NxCloudFixFile)
    
    private var isShowingPreview = false

    init {
        panel.add(toolbar, BorderLayout.NORTH)
        panel.add(splitter, BorderLayout.CENTER)
        
        // Start with webview only
        showWebviewOnly()
    }

    override fun getComponent(): JComponent = panel
    override fun getFile(): VirtualFile = file
    override fun getName(): String = "AI Fix"
    override fun getPreferredFocusedComponent(): JComponent? = webviewEditor.component

    fun showWithPreview() {
        if (!isShowingPreview) {
            splitter.firstComponent = webviewEditor.component
            splitter.secondComponent = diffPreviewEditor.component
            splitter.isShowDividerControls = true
            splitter.isShowDividerIcon = true
            isShowingPreview = true
        }
    }
    
    private fun showWebviewOnly() {
        splitter.firstComponent = webviewEditor.component
        splitter.secondComponent = null
        isShowingPreview = false
    }
    
    private fun togglePreview() {
        if (isShowingPreview) {
            showWebviewOnly()
        } else {
            showWithPreview()
        }
    }

    private fun createToolbar(): JComponent {
        val toggleDiffAction = object : AnAction("Toggle Diff", "Toggle diff preview", AllIcons.Actions.Diff) {
            override fun actionPerformed(e: AnActionEvent) {
                togglePreview()
            }
            
            override fun update(e: AnActionEvent) {
                e.presentation.icon = if (isShowingPreview) AllIcons.Actions.PreviewDetails else AllIcons.Actions.Diff
            }
        }
        
        val actionGroup = DefaultActionGroup(toggleDiffAction)
        val toolbar = ActionManager.getInstance().createActionToolbar(ActionPlaces.EDITOR_TOOLBAR, actionGroup, true)
        toolbar.targetComponent = panel
        return toolbar.component
    }
    
    fun updateDiff(gitDiff: String?) {
        diffPreviewEditor.updateDiff(gitDiff)
        // Automatically show preview if there's a diff
        if (gitDiff != null && gitDiff.isNotBlank() && !isShowingPreview) {
            showWithPreview()
        }
    }
}