package dev.nx.console.cloud

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import dev.nx.console.cloud.cloud_fix_ui.NxCloudFixDetails
import dev.nx.console.cloud.cloud_fix_ui.NxCloudFixFileImpl
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Service(Service.Level.PROJECT)
class CloudFixService(private val project: Project, private val cs: CoroutineScope) {

    companion object {
        private const val NOTIFICATION_GROUP_ID = "Nx Cloud CIPE"
        private val NOTIFICATION_GROUP =
            NotificationGroupManager.getInstance().getNotificationGroup(NOTIFICATION_GROUP_ID)

        fun getInstance(project: Project): CloudFixService =
            project.getService(CloudFixService::class.java)
    }

    private val logger = thisLogger()

    fun openCloudFixWebview(cipeId: String, runGroupId: String) {
        logger.info(
            "[CLOUD_FIX] Opening cloud fix webview for CIPE: $cipeId, runGroup: $runGroupId"
        )

        cs.launch {
            val currentData = NxlsService.getInstance(project).recentCIPEData()

            val cipe = currentData?.info?.find { it.ciPipelineExecutionId == cipeId }
            val runGroup = cipe?.runGroups?.find { it.runGroup == runGroupId }

            if (cipe == null || runGroup == null) {
                withContext(Dispatchers.EDT) {
                    NOTIFICATION_GROUP.createNotification(
                            "AI Fix Not Found",
                            "Could not find the AI fix data",
                            NotificationType.ERROR
                        )
                        .notify(project)
                }
                return@launch
            }

            // Fetch terminal output
            var terminalOutput: String? = null
            val aiFix = runGroup.aiFix
            if (aiFix != null && aiFix.taskIds.isNotEmpty()) {
                val failedTaskId = aiFix.taskIds.first()
                val terminalOutputUrl = aiFix.terminalLogsUrls[failedTaskId]

                if (terminalOutputUrl != null) {
                    try {
                        val response =
                            NxlsService.getInstance(project)
                                .downloadAndExtractArtifact(terminalOutputUrl)

                        if (response?.error != null) {
                            logger.warn("Failed to download terminal output: ${response.error}")
                            terminalOutput =
                                "Failed to retrieve terminal output. Please check the Nx Console output for more details."
                        } else {
                            terminalOutput = response?.content
                        }
                    } catch (e: Exception) {
                        logger.error("Failed to download terminal output for task $failedTaskId", e)
                        terminalOutput =
                            "Failed to retrieve terminal output. Please check the Nx Console output for more details."
                    }
                }
            }

            val fixDetails =
                NxCloudFixDetails(cipe = cipe, runGroup = runGroup, terminalOutput = terminalOutput)

            // UI operations must happen on EDT
            withContext(Dispatchers.EDT) {
                // Create and open the webview
                val fixFile = NxCloudFixFileImpl("AI Fix", project)
                val fileEditorManager = FileEditorManager.getInstance(project)
                fileEditorManager.openFile(fixFile, true)

                // Show fix details once editor is open
                fixFile.showFixDetails(fixDetails)
            }
        }
    }
}
