package dev.nx.console.ide

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.editor.CaretModel
import com.intellij.openapi.editor.LogicalPosition
import com.intellij.openapi.editor.ScrollType
import com.intellij.openapi.editor.ScrollingModel
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.psi.PsiManager
import dev.nx.console.NxConsoleBundle
import dev.nx.console.models.NxProject
import dev.nx.console.nx_toolwindow.tree.NxSimpleNode
import dev.nx.console.nx_toolwindow.tree.NxTreeNodeKey
import dev.nx.console.nx_toolwindow.tree.NxTreeNodeProjectKey
import dev.nx.console.nxls.NxlsService
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.findLineNumberForTargetAndConfiguration
import dev.nx.console.utils.nxProjectConfigurationPath
import dev.nx.console.utils.selectNxProject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ShowNxProjectConfigurationAction : DumbAwareAction(AllIcons.Actions.EditSource) {
    init {
        registerCustomShortcutSet(
            ActionManager.getInstance().getAction(IdeActions.ACTION_EDIT_SOURCE).shortcutSet,
            null
        )
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        if (e.place == "NxToolWindow") {
            if (
                this.projectNode(e) == null &&
                    this.targetNode(e) == null &&
                    this.targetConfigurationNode(e) == null
            ) {
                e.presentation.isEnabledAndVisible = false
            } else {
                e.presentation.text = NxConsoleBundle.message("edit.configuration")
            }
        }

        super.update(e)
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project).featureUsed("Show Project Configuration")

        val path = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path

        CoroutineScope(Dispatchers.Default).launch {
            val currentlyOpenedProject =
                path?.let { NxlsService.getInstance(project).projectByPath(path = path) }
            val nxProject: NxProject =
                if (e.place === "NxToolWindow") {
                    e.getData(NxTreeNodeProjectKey) ?: return@launch
                } else
                    if (ActionPlaces.isPopupPlace(e.place)) {
                        if (currentlyOpenedProject == null) {
                            Notifier.notifyNoProject(project, path)
                            return@launch
                        }
                        currentlyOpenedProject
                    } else {
                        val selectedNxProject =
                            selectNxProject(project, e.dataContext, currentlyOpenedProject?.name)
                                ?: return@launch

                        NxlsService.getInstance(project)
                            .workspace()
                            ?.workspace
                            ?.projects
                            ?.get(selectedNxProject)
                    } ?: return@launch

            ApplicationManager.getApplication().invokeLater {
                val projectFilePath =
                    nxProjectConfigurationPath(project, nxProject.root) ?: return@invokeLater
                val projectFile =
                    LocalFileSystem.getInstance().findFileByPath(projectFilePath)
                        ?: return@invokeLater

                val fileEditorManager = FileEditorManager.getInstance(project)

                fileEditorManager.openFile(projectFile, true)

                if (e.place == "NxToolWindow") {
                    val nxTarget = this@ShowNxProjectConfigurationAction.targetNode(e)?.nxTargetName
                    val nxTargetConfiguration =
                        this@ShowNxProjectConfigurationAction.targetConfigurationNode(e)
                            ?.nxTargetConfigurationName

                    val psiFile =
                        PsiManager.getInstance(project).findFile(projectFile) ?: return@invokeLater
                    val lineNumber =
                        findLineNumberForTargetAndConfiguration(
                            psiFile,
                            nxTarget,
                            nxTargetConfiguration
                        ) ?: return@invokeLater

                    val editor = fileEditorManager.selectedTextEditor

                    if (editor != null && lineNumber > 0) {
                        val caretModel: CaretModel = editor.caretModel
                        val logicalPosition = LogicalPosition(lineNumber, 0)
                        caretModel.moveToLogicalPosition(logicalPosition)
                        val scrollingModel: ScrollingModel = editor.scrollingModel
                        scrollingModel.scrollToCaret(ScrollType.CENTER)
                    }
                }
            }
        }
    }

    private fun projectNode(e: AnActionEvent) = e.getData(NxTreeNodeKey) as? NxSimpleNode.Project

    private fun targetNode(e: AnActionEvent) = e.getData(NxTreeNodeKey) as? NxSimpleNode.Target

    private fun targetConfigurationNode(e: AnActionEvent) =
        e.getData(NxTreeNodeKey) as? NxSimpleNode.TargetConfiguration
}
