package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.actionSystem.CustomShortcutSet
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.keymap.KeymapUtil
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.NxIcons
import dev.nx.console.graph.NxGraphService
import dev.nx.console.nx_toolwindow.tree.NxSimpleNode
import dev.nx.console.nx_toolwindow.tree.NxTreeNodeKey
import dev.nx.console.services.NxlsService
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.ui.Notifier
import dev.nx.console.utils.selectNxProject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class NxGraphFocusProjectAction : DumbAwareAction("Nx Graph: Focus Project") {

    init {
        useKeyMapShortcutSetOrDefault()
    }
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

        TelemetryService.getInstance(project).featureUsed("Nx Graph Select Project")
        val path = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path

        CoroutineScope(Dispatchers.Default).launch {
            val currentlyOpenedProject =
                path?.let {
                    NxlsService.getInstance(project).generatorContextFromPath(path = it)?.project
                }

            val nxProjectName: String? = getNxProject(e, currentlyOpenedProject)

            if (nxProjectName == null) {
                Notifier.notifyNoProject(project, path)
                return@launch
            }

            ApplicationManager.getApplication().invokeLater {
                val graphService = NxGraphService.getInstance(project)
                graphService.showNxGraphInEditor()
                graphService.focusProject(nxProjectName)
            }
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
