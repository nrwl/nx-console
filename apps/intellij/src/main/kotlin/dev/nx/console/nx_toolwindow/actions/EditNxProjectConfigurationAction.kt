package dev.nx.console.nx_toolwindow.actions

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.IdeActions
import com.intellij.openapi.editor.CaretModel
import com.intellij.openapi.editor.LogicalPosition
import com.intellij.openapi.editor.ScrollType
import com.intellij.openapi.editor.ScrollingModel
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.psi.PsiManager
import dev.nx.console.NxConsoleBundle
import dev.nx.console.nx_toolwindow.tree.NxSimpleNode
import dev.nx.console.nx_toolwindow.tree.NxTreeNodeKey
import dev.nx.console.nx_toolwindow.tree.NxTreeNodeProjectKey
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.findLineNumberForTargetAndConfiguration
import dev.nx.console.utils.nxProjectConfigurationPath

class EditNxProjectConfigurationAction : DumbAwareAction(AllIcons.Actions.EditSource) {
    init {
        registerCustomShortcutSet(
            ActionManager.getInstance().getAction(IdeActions.ACTION_EDIT_SOURCE).shortcutSet,
            null
        )
    }

    override fun update(e: AnActionEvent) {
        if (
            this.projectNode(e) == null &&
                this.targetNode(e) == null &&
                this.targetConfigurationNode(e) == null
        ) {
            e.presentation.isEnabledAndVisible = false
        } else {
            e.presentation.text = NxConsoleBundle.message("edit.configuration")
        }

        super.update(e)
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project).featureUsed("Edit Project Configuration")

        val nxProject = e.getData(NxTreeNodeProjectKey) ?: return

        val projectFilePath = nxProjectConfigurationPath(project, nxProject.root) ?: return
        val projectFile = LocalFileSystem.getInstance().findFileByPath(projectFilePath) ?: return

        val fileEditorManager = FileEditorManager.getInstance(project)

        fileEditorManager.openFile(projectFile, true)

        val nxTarget = this.targetNode(e)?.nxTargetName
        val nxTargetConfiguration = this.targetConfigurationNode(e)?.nxTargetConfigurationName

        val psiFile = PsiManager.getInstance(project).findFile(projectFile) ?: return
        val lineNumber =
            findLineNumberForTargetAndConfiguration(psiFile, nxTarget, nxTargetConfiguration)
                ?: return

        val editor = fileEditorManager.selectedTextEditor

        if (editor != null && lineNumber > 0) {
            val caretModel: CaretModel = editor.caretModel
            val logicalPosition = LogicalPosition(lineNumber, 0)
            caretModel.moveToLogicalPosition(logicalPosition)
            val scrollingModel: ScrollingModel = editor.scrollingModel
            scrollingModel.scrollToCaret(ScrollType.CENTER)
        }
    }

    private fun projectNode(e: AnActionEvent) = e.getData(NxTreeNodeKey) as? NxSimpleNode.Project
    private fun targetNode(e: AnActionEvent) = e.getData(NxTreeNodeKey) as? NxSimpleNode.Target
    private fun targetConfigurationNode(e: AnActionEvent) =
        e.getData(NxTreeNodeKey) as? NxSimpleNode.TargetConfiguration
}
