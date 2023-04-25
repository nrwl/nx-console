package dev.nx.console.nx_toolwindow.actions

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.IdeActions
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.vfs.LocalFileSystem
import dev.nx.console.NxConsoleBundle
import dev.nx.console.nx_toolwindow.NxSimpleNode
import dev.nx.console.nx_toolwindow.NxTreeNodeKey
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.nxProjectConfigurationPath

class EditNxProjectConfigurationAction : DumbAwareAction(AllIcons.Actions.EditSource) {
    init {
        shortcutSet =
            ActionManager.getInstance().getAction(IdeActions.ACTION_EDIT_SOURCE).shortcutSet
    }

    override fun update(e: AnActionEvent) {
        if (this.projectNode(e) == null && this.targetNode(e) == null) {
            e.presentation.isEnabledAndVisible = false
        } else {
            e.presentation.text = NxConsoleBundle.message("edit.configuration")
        }

        super.update(e)
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project).featureUsed("Edit Project Configuration")

        val node = this.projectNode(e) ?: this.targetNode(e) ?: return

        val projectFilePath = nxProjectConfigurationPath(project, node.nxProject?.root) ?: return
        val projectFile = LocalFileSystem.getInstance().findFileByPath(projectFilePath) ?: return

        FileEditorManager.getInstance(project).openFile(projectFile, true)
    }

    private fun projectNode(e: AnActionEvent) = e.getData(NxTreeNodeKey) as? NxSimpleNode.Project
    private fun targetNode(e: AnActionEvent) = e.getData(NxTreeNodeKey) as? NxSimpleNode.Target
}
