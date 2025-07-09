package dev.nx.console.cloud

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.util.messages.MessageBusConnection
import dev.nx.console.cloud.cloud_fix_ui.NxCloudFixDetails
import dev.nx.console.cloud.cloud_fix_ui.NxCloudFixFileImpl
import dev.nx.console.models.CIPEDataResponse
import dev.nx.console.nxls.NxWorkspaceRefreshListener
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.GitUtils
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Service(Service.Level.PROJECT)
class CloudFixUIService(private val project: Project, private val cs: CoroutineScope) {

    companion object {
        private const val NOTIFICATION_GROUP_ID = "Nx Cloud CIPE"
        private val NOTIFICATION_GROUP =
            NotificationGroupManager.getInstance().getNotificationGroup(NOTIFICATION_GROUP_ID)

        fun getInstance(project: Project): CloudFixUIService =
            project.getService(CloudFixUIService::class.java)
    }

    private val logger = thisLogger()

    private var currentFixId: String? = null
    private var currentFixFile: NxCloudFixFileImpl? = null
    private var currentFixDetails: NxCloudFixDetails? = null

    init {
        setupListeners()
    }

    private fun setupListeners() {
        val pollingService = CIPEPollingService.getInstance(project)
        cs.launch {
            pollingService.currentData.collect { cipeData ->
                cipeData?.let { handleCIPEDataUpdate(it) }
            }
        }

            project.messageBus.connect().subscribe(
            NxlsService.NX_WORKSPACE_REFRESH_TOPIC,
            NxWorkspaceRefreshListener {
                if (project.isDisposed) {
                    return@NxWorkspaceRefreshListener
                }
                updateUncommittedChangesFlag()
            }
        )
    }

    private fun handleCIPEDataUpdate(cipeDataResponse: CIPEDataResponse) {
        val fixDetails = currentFixDetails ?: return
        val fixFile = currentFixFile ?: return

        val cipe = cipeDataResponse.info?.find {
            it.ciPipelineExecutionId == fixDetails.cipe.ciPipelineExecutionId
        }
        val runGroup = cipe?.runGroups?.find {
            it.runGroup == fixDetails.runGroup.runGroup
        }

        if (cipe != null && runGroup != null) {
            val updatedDetails = NxCloudFixDetails(
                cipe = cipe,
                runGroup = runGroup,
                terminalOutput = fixDetails.terminalOutput,
                hasUncommittedChanges = GitUtils.hasUncommittedChanges(project)
            )
            currentFixDetails = updatedDetails
            fixFile.sendFixDetailsToWebview(updatedDetails)
        }
    }

    private fun updateUncommittedChangesFlag() {
        val fixFile = currentFixFile ?: return
        fixFile.updateUncommittedChangesFlag()
    }

    fun openCloudFixWebview(cipeId: String, runGroupId: String) {
        logger.info(
            "Opening cloud fix webview for CIPE: $cipeId, runGroup: $runGroupId"
        )

        val fixId = cipeId + runGroupId

        if (currentFixFile != null && currentFixDetails != null && currentFixId != null) {
            if (fixId === currentFixId) {
                ApplicationManager.getApplication().invokeLater {
                        val fileEditorManager = FileEditorManager.getInstance(project)
                        currentFixFile?.let { file ->
                            fileEditorManager.openFile(file, true)
                        }
                    }
                return
            } else {
                closeCurrentFixUI()
            }
        }

        currentFixId = fixId

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

            withContext(Dispatchers.EDT) {
                val fixFile = NxCloudFixFileImpl("AI Fix", project) {
                    onFixFileClosed(it)
                }
                val fileEditorManager = FileEditorManager.getInstance(project)
                fileEditorManager.openFile(fixFile, true)

                fixFile.showFixDetails(fixDetails)

                currentFixFile = fixFile
                currentFixDetails = fixDetails
            }
        }
    }

    private fun closeCurrentFixUI() {
        ApplicationManager.getApplication().invokeLater {
                currentFixFile?.let { file ->
                    FileEditorManager.getInstance(project).closeFile(file)
                }
                currentFixFile = null
                currentFixDetails = null
        }
    }

    fun onFixFileClosed(file: NxCloudFixFileImpl) {
        if (currentFixFile == file) {
            currentFixFile = null
            currentFixDetails = null
        }
    }

}
