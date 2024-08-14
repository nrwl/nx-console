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
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.selectNxProject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class NxGraphFocusProjectAction : DumbAwareAction("Nx Graph: Focus Project") {

    init {
        useKeyMapShortcutSetOrDefault()
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        useKeyMapShortcutSetOrDefault()
        val nxTreeNode = e.getData(NxTreeNodeKey) ?: return
        if (nxTreeNode !is NxSimpleNode.Project) {
            e.presentation.isEnabledAndVisible = false
        }
        e.presentation.icon = NxIcons.Action
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project)
            .featureUsed(
                TelemetryEvent.GRAPH_FOCUS_PROJECT,
                mapOf(
                    "source" to
                        if (e.place == "NxToolWindow") TelemetryEventSource.PROJECTS_VIEW
                        else if (ActionPlaces.isPopupPlace(e.place))
                            TelemetryEventSource.EXPLORER_CONTEXT_MENU
                        else TelemetryEventSource.COMMAND
                )
            )
        val path = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path

        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val currentlyOpenedProject =
                path?.let { NxlsService.getInstance(project).projectByPath(path = it)?.name }

            val nxProjectName: String? = getNxProject(e, currentlyOpenedProject)

            if (nxProjectName == null) {
                Notifier.notifyNoProject(project, path)
                return@launch
            }

            val nxGraphService = getNxGraphService(project) ?: return@launch
            withContext(Dispatchers.EDT) { nxGraphService.focusProject(nxProjectName) }
        }
    }

    private suspend fun getNxProject(e: AnActionEvent, currentlyOpenedProject: String?): String? {
        if (e.place == "NxToolWindow") {
            val nxTreeNode = e.getData(NxTreeNodeKey) ?: return null
            if (nxTreeNode is NxSimpleNode.Target) {
                return nxTreeNode.nxProjectName
            }
            if (nxTreeNode is NxSimpleNode.TargetConfiguration) {
                return nxTreeNode.nxProjectName
            }
            if (nxTreeNode is NxSimpleNode.Project) {
                return nxTreeNode.nxProjectName
            }
        }

        if (ActionPlaces.isPopupPlace(e.place)) {
            return currentlyOpenedProject
        }

        val project = e.project ?: return null

        return selectNxProject(project, e.dataContext, currentlyOpenedProject)
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
        const val DEFAULT_SHORTCUT = "control shift G"
        const val ID = "dev.nx.console.graph.actions.NxGraphFocusProjectAction"
    }
}
