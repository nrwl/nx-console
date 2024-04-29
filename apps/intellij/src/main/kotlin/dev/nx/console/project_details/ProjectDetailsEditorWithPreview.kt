package dev.nx.console.project_details

import com.intellij.icons.AllIcons
import com.intellij.ide.actions.RefreshAction
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.TextEditor
import com.intellij.openapi.fileEditor.TextEditorWithPreview
import com.intellij.openapi.fileEditor.impl.text.TextEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import dev.nx.console.models.NxVersion
import dev.nx.console.nxls.NxRefreshWorkspaceAction
import dev.nx.console.utils.NxVersionUtil
import java.util.function.Supplier

class ProjectDetailsEditorWithPreview(project: Project, file: VirtualFile) :
    TextEditorWithPreview(createEditor(project, file), createPreviewComponent(project, file)),
    DumbAware {
    init {
        layout =
            NxVersionUtil.getInstance(project).nxVersion.let {
                if (it == null || !it.gte(NxVersion(major = 17, minor = 13, full = "17.13.0"))) {
                    Layout.SHOW_EDITOR
                } else {
                    Layout.SHOW_EDITOR_AND_PREVIEW
                }
            }
    }

    fun showWithPreview() {
        this.layout = Layout.SHOW_EDITOR_AND_PREVIEW
    }

    override fun createRightToolbar(): ActionToolbar {
        val viewActions = createViewActionGroup().getChildren(null)
        val refreshAction =
            object :
                RefreshAction(
                    "Refresh Nx Workspace",
                    "Refresh Nx Workspace",
                    AllIcons.Actions.Refresh
                ) {
                override fun getActionUpdateThread() = ActionUpdateThread.BGT

                override fun update(e: AnActionEvent) {
                    e.presentation.isEnabled = true
                }

                override fun actionPerformed(e: AnActionEvent) {
                    NxRefreshWorkspaceAction().actionPerformed(e)
                }
            }

        val viewActionsGroup: ActionGroup =
            HalfConditionalActionGroup(viewActions, arrayOf(refreshAction)) { !isShowActionsInTabs }
        return ActionManager.getInstance()
            .createActionToolbar(ActionPlaces.TEXT_EDITOR_WITH_PREVIEW, viewActionsGroup, true)
    }

    companion object {
        private fun createEditor(project: Project, file: VirtualFile): TextEditor {
            return (TextEditorProvider.getInstance().createEditor(project, file) as TextEditor)
        }

        private fun createPreviewComponent(project: Project, file: VirtualFile): FileEditor {
            return ProjectDetailsPreviewFileEditor(project, file)
        }
    }

    private class HalfConditionalActionGroup(
        private val conditionalActions: Array<AnAction>,
        private val alwaysActions: Array<AnAction>,
        private val condition: Supplier<Boolean>
    ) : ActionGroup() {
        override fun getChildren(e: AnActionEvent?): Array<AnAction> {
            return if (condition.get()) conditionalActions + alwaysActions else alwaysActions
        }
    }
}
