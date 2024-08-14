package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CustomShortcutSet
import com.intellij.openapi.application.EDT
import com.intellij.openapi.keymap.KeymapUtil
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.NxIcons
import dev.nx.console.graph.getNxGraphService
import dev.nx.console.nx_toolwindow.tree.NxSimpleNode
import dev.nx.console.nx_toolwindow.tree.NxTreeNodeKey
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class NxGraphFocusTaskGroupAction : DumbAwareAction() {

    override fun update(e: AnActionEvent) {
        useKeyMapShortcutSetOrDefault()
        val targetsList: NxSimpleNode.TargetsList? =
            e.getData(NxTreeNodeKey).let { it as? NxSimpleNode.TargetsList }

        if (targetsList == null) {
            e.presentation.isEnabledAndVisible = false
        } else {
            e.presentation.text = "Nx Graph: Focus ${targetsList.name} targets"
            e.presentation.icon = NxIcons.Action
        }
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        TelemetryService.getInstance(project)
            .featureUsed(
                TelemetryEvent.GRAPH_SHOW_TASK_GROUP,
                mapOf("source" to TelemetryEventSource.PROJECTS_VIEW)
            )

        val targetsList: NxSimpleNode.TargetsList =
            e.getData(NxTreeNodeKey).let { it as? NxSimpleNode.TargetsList } ?: return

        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val nxGraphService = getNxGraphService(project) ?: return@launch
            withContext(Dispatchers.EDT) { nxGraphService.focusTaskGroup(targetsList.name) }
        }
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
        const val DEFAULT_SHORTCUT = "control shift U"
        const val ID = "dev.nx.console.graph.actions.NxGraphFocusTaskGroupAction"
    }
}
