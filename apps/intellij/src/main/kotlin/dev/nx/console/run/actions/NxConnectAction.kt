package dev.nx.console.run.actions

import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.process.KillableColoredProcessHandler
import com.intellij.execution.ui.RunContentDescriptor
import com.intellij.execution.ui.RunContentManager
import com.intellij.lang.javascript.modules.ConsoleProgress
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import dev.nx.console.NxIcons
import dev.nx.console.nx_toolwindow.tree.NxSimpleNode
import dev.nx.console.nx_toolwindow.tree.NxTreeNodeKey
import dev.nx.console.nxls.NxlsService
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.NxLatestVersionGeneralCommandLine
import dev.nx.console.utils.sync_services.NxCloudStatusSyncAccessService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class NxConnectAction : AnAction() {

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        val project = e.project ?: return
        val nxCloudStatusSyncAccessService = NxCloudStatusSyncAccessService.getInstance(project)
        if (nxCloudStatusSyncAccessService.cloudStatus?.isConnected == true) {
            e.presentation.isEnabledAndVisible = false
            return
        }
        val nxTreeNode = e.getData(NxTreeNodeKey) ?: return
        if (nxTreeNode !is NxSimpleNode.Target || nxTreeNode.nonAtomizedTarget == null) {
            e.presentation.isEnabledAndVisible = false
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        NxConnectService.getInstance(project).connectToCloud()
    }
}

@Service(Service.Level.PROJECT)
class NxConnectService(private val project: Project, private val cs: CoroutineScope) {
    fun connectToCloud() {
        cs.launch {
            val cloudStatus = NxlsService.getInstance(project).cloudStatus()
            withContext(Dispatchers.EDT) {
                if (cloudStatus != null && cloudStatus.isConnected) {
                    Notifier.notifyAnything(
                        project,
                        "You are already connected to Nx Cloud",
                        NotificationType.INFORMATION
                    )
                    return@withContext
                }
                TelemetryService.getInstance(project).featureUsed(TelemetryEvent.CLOUD_CONNECT)

                val commandLine = NxLatestVersionGeneralCommandLine(project, listOf("connect"))

                val processHandler = KillableColoredProcessHandler(commandLine)
                val console = TextConsoleBuilderFactory.getInstance().createBuilder(project).console

                console.attachToProcess(processHandler)
                ConsoleProgress.install(console, processHandler)

                val contentDescriptor =
                    RunContentDescriptor(
                        console,
                        processHandler,
                        console.component,
                        "Nx Generate",
                        NxIcons.Action
                    )

                val runContentManager = RunContentManager.getInstance(project)
                runContentManager.showRunContent(
                    DefaultRunExecutor.getRunExecutorInstance(),
                    contentDescriptor
                )

                processHandler.startNotify()
            }
        }
    }

    companion object {
        fun getInstance(project: Project): NxConnectService {
            return project.getService(NxConnectService::class.java)
        }
    }
}
