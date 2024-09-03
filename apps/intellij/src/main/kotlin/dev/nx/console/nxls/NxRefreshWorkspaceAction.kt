package dev.nx.console.nxls

import StandardNxGraphServer
import com.intellij.notification.Notification
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.project.Project
import dev.nx.console.NxIcons
import dev.nx.console.graph.ui.NxGraphFileType
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.Notifier
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext

class NxRefreshWorkspaceAction :
    DumbAwareAction("Refresh Nx Workspace", "Refreshes the Nx workspace", NxIcons.Action) {

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.BGT
    }

    override fun update(e: AnActionEvent) {
        if (
            e.place == ActionPlaces.getPopupPlace(ActionPlaces.TABS_MORE_TOOLBAR) ||
                e.place == ActionPlaces.EDITOR_TAB_POPUP
        ) {
            val file = e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)
            if (file != null && file.fileType.name == NxGraphFileType.INSTANCE.name) {
                e.presentation.isVisible = true
                return
            } else {
                e.presentation.isVisible = false
            }
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project)
            .featureUsed(
                TelemetryEvent.MISC_REFRESH_WORKSPACE,
                mapOf(
                    "source" to
                        if (
                            e.place == ActionPlaces.getPopupPlace(ActionPlaces.TABS_MORE_TOOLBAR) ||
                                e.place == ActionPlaces.EDITOR_TAB_POPUP
                        )
                            TelemetryEventSource.EDITOR_TOOLBAR
                        else TelemetryEventSource.COMMAND
                ),
            )

        try {
            Notification.get(e).expire()
        } catch (e: Throwable) {
            // do nothing
            // This action can be triggered from a notification as well as the command prompt
        }

        NxRefreshWorkspaceService.getInstance(project).refreshWorkspace()
    }
}

@Service(Service.Level.PROJECT)
class NxRefreshWorkspaceService(private val project: Project) {
    private var refreshing = false

    fun refreshWorkspace() {
        if (refreshing) {
            return
        }
        refreshing = true

        val notification = Notifier.notifyNxRefresh(project)

        ProgressManager.getInstance()
            .run(
                object : Task.Backgroundable(project, "Refreshing Workspace", false) {
                    override fun run(indicator: ProgressIndicator) {
                        runBlocking {
                            try {
                                withContext(Dispatchers.EDT) {
                                    indicator.isIndeterminate = false
                                    indicator.fraction = 0.1
                                    NxlsService.getInstance(project).restart()
                                    indicator.fraction = 0.5
                                    StandardNxGraphServer.getInstance(project).restart()
                                    indicator.fraction = 0.8
                                    NxlsService.getInstance(project).refreshWorkspace()
                                    indicator.fraction = 1.0

                                    if (notification?.isExpired == false) {
                                        notification.expire()
                                        Notifier.notifyAnything(
                                            project,
                                            "Successfully refreshed Nx workspace",
                                            NotificationType.INFORMATION,
                                        )
                                    }
                                }
                            } catch (ex: Exception) {
                                if (notification?.isExpired == false) {
                                    notification.expire()
                                }
                                Notifier.notifyAnything(project, "Error refreshing workspace")
                            } finally {
                                refreshing = false
                            }
                        }
                    }
                }
            )
    }

    companion object {
        fun getInstance(project: Project): NxRefreshWorkspaceService {
            return project.getService(NxRefreshWorkspaceService::class.java)
        }
    }
}
