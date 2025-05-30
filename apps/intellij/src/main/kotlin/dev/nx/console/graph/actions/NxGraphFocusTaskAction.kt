package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.EDT
import com.intellij.openapi.keymap.KeymapUtil
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.NxIcons
import dev.nx.console.graph.getNxGraphService
import dev.nx.console.nx_toolwindow.tree.NxSimpleNode
import dev.nx.console.nx_toolwindow.tree.NxTreeNodeKey
import dev.nx.console.nxls.NxlsService
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.*
import kotlinx.coroutines.*

class NxGraphFocusTaskAction(private val targetDescriptor: NxTargetDescriptor? = null) :
    DumbAwareAction() {

    init {
        useKeyMapShortcutSetOrDefault()
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        useKeyMapShortcutSetOrDefault()
        if (e.place != "NxToolWindow" && targetDescriptor == null) {
            return
        }
        val targetDescriptor =
            this.targetDescriptor ?: getTargetDescriptorFromDataContext(e.dataContext)
        if (targetDescriptor == null) {
            e.presentation.isEnabledAndVisible = false
        } else {
            e.presentation.text =
                "Nx Graph: Focus ${targetDescriptor.nxProject}:${targetDescriptor.nxTarget} target"
            e.presentation.icon = NxIcons.Action
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project)
            .featureUsed(
                TelemetryEvent.GRAPH_SHOW_TASK,
                mapOf(
                    "source" to
                        if (e.place == "NxToolWindow") TelemetryEventSource.PROJECTS_VIEW
                        else if (e.isFromContextMenu()) TelemetryEventSource.EXPLORER_CONTEXT_MENU
                        else TelemetryEventSource.COMMAND
                )
            )

        val path = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path

        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val currentlyOpenedProject =
                path?.let { NxlsService.getInstance(project).projectByPath(path = path)?.name }
            val targetDescriptor: NxTargetDescriptor =
                this@NxGraphFocusTaskAction.targetDescriptor
                    ?: if (e.place == "NxToolWindow") {
                        getTargetDescriptorFromDataContext(e.dataContext)
                    } else {
                        val nxProject =
                            if (e.isFromContextMenu()) currentlyOpenedProject
                            else selectNxProject(project, e.dataContext, currentlyOpenedProject)

                        if (nxProject == null) {
                            Notifier.notifyNoProject(project, path)
                            return@launch
                        }

                        val nxTarget =
                            selectTargetForNxProject(project, e.dataContext, nxProject)
                                ?: return@launch

                        NxTargetDescriptor(nxProject, nxTarget)
                    }
                        ?: return@launch

            val nxGraphService = getNxGraphService(project) ?: return@launch

            withContext(Dispatchers.EDT) {
                nxGraphService.focusTask(targetDescriptor.nxProject, targetDescriptor.nxTarget)
            }
        }
    }

    private fun getTargetDescriptorFromDataContext(dataContext: DataContext): NxTargetDescriptor? {
        val targetTreeNode: NxSimpleNode.Target? =
            dataContext.getData(NxTreeNodeKey).let { it as? NxSimpleNode.Target }

        if (targetTreeNode != null) {
            return NxTargetDescriptor(targetTreeNode.nxProjectName, targetTreeNode.nxTargetName)
        }

        return null
    }

    private fun useKeyMapShortcutSetOrDefault() {
        val keyMapSet = KeymapUtil.getActiveKeymapShortcuts(ID)

        if (keyMapSet.shortcuts.isEmpty()) {
            shortcutSet = CustomShortcutSet.fromString(DEFAULT_SHORTCUT)
        } else {
            shortcutSet = keyMapSet
        }
    }

    companion object {
        const val DEFAULT_SHORTCUT = "control shift T"
        const val ID = "dev.nx.console.graph.actions.NxGraphFocusTaskAction"
    }
}
