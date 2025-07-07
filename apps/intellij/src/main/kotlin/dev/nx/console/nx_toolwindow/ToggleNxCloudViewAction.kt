package dev.nx.console.nx_toolwindow

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.ToggleAction
import com.intellij.util.messages.Topic

class ToggleNxCloudViewAction : ToggleAction("Show Nx Cloud Panel") {

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        NxToolWindowPanel.setCloudPanelCollapsed(
            project,
            !NxToolWindowPanel.getCloudPanelCollapsed(project),
        )
        project.messageBus
            .syncPublisher(NX_TOOLWINDOW_CLOUD_VIEW_COLLAPSED_TOPIC)
            .onCloudViewCollapsed()
    }

    override fun isSelected(e: AnActionEvent): Boolean {
        val project = e.project ?: return true
        return !NxToolWindowPanel.getCloudPanelCollapsed(project)
    }

    override fun setSelected(e: AnActionEvent, state: Boolean) {
        val project = e.project ?: return
        NxToolWindowPanel.setCloudPanelCollapsed(project, !state)
    }

    companion object {
        val NX_TOOLWINDOW_CLOUD_VIEW_COLLAPSED_TOPIC:
            Topic<NxToolwindowCloudViewCollapsedListener> =
            Topic(
                "NxToolwindowCloudViewCollapsedTopic",
                NxToolwindowCloudViewCollapsedListener::class.java,
            )
    }

    interface NxToolwindowCloudViewCollapsedListener {
        fun onCloudViewCollapsed()
    }
}
