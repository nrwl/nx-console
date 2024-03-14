package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CustomShortcutSet
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.keymap.KeymapUtil
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.NxIcons
import dev.nx.console.graph.getNxGraphService
import dev.nx.console.nx_toolwindow.tree.NxSimpleNode
import dev.nx.console.nx_toolwindow.tree.NxTreeNodeKey
import dev.nx.console.telemetry.TelemetryService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class NxGraphFocusTaskGroupAction : DumbAwareAction() {

    override fun update(e: AnActionEvent) {
        useKeyMapShortcutSetOrDefault()
        val targetGroup: NxSimpleNode.TargetGroup? =
            e.getData(NxTreeNodeKey).let { it as? NxSimpleNode.TargetGroup }

        if (targetGroup == null) {
            e.presentation.isEnabledAndVisible = false
        } else {
            e.presentation.text = "Nx Graph: Focus ${targetGroup.name} targets"
            e.presentation.icon = NxIcons.Action
        }
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        TelemetryService.getInstance(project).featureUsed("Nx Graph Focus Task Group")
        val targetGroup: NxSimpleNode.TargetGroup =
            e.getData(NxTreeNodeKey).let { it as? NxSimpleNode.TargetGroup } ?: return

        CoroutineScope(Dispatchers.Default).launch {
            val nxGraphService = getNxGraphService(project) ?: return@launch
            ApplicationManager.getApplication().invokeLater {
                nxGraphService.focusTaskGroup(targetGroup.name)
            }
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
