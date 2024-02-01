package dev.nx.console.graph.actions

import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.keymap.KeymapUtil
import com.intellij.openapi.project.DumbAwareAction
import dev.nx.console.NxIcons
import dev.nx.console.graph.getNxGraphService
import dev.nx.console.nx_toolwindow.tree.NxSimpleNode
import dev.nx.console.nx_toolwindow.tree.NxTreeNodeKey
import dev.nx.console.nxls.NxlsService
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.NxTargetDescriptor
import dev.nx.console.utils.selectNxProject
import dev.nx.console.utils.selectTargetForNxProject
import kotlinx.coroutines.*

class NxGraphFocusTaskAction(private val targetDescriptor: NxTargetDescriptor? = null) :
    DumbAwareAction() {

    init {
        useKeyMapShortcutSetOrDefault()
    }

    override fun getActionUpdateThread() = ActionUpdateThread.EDT

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

        TelemetryService.getInstance(project).featureUsed("Nx Graph Focus Task")

        val path = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path

        CoroutineScope(Dispatchers.Default).launch {
            val currentlyOpenedProject =
                path?.let { NxlsService.getInstance(project).projectByPath(path = path)?.name }
            val targetDescriptor: NxTargetDescriptor =
                this@NxGraphFocusTaskAction.targetDescriptor
                    ?: if (e.place == "NxToolWindow") {
                        getTargetDescriptorFromDataContext(e.dataContext)
                    } else {
                        val nxProject =
                            if (ActionPlaces.isPopupPlace(e.place)) currentlyOpenedProject
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

            ApplicationManager.getApplication().invokeLater {
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
