package dev.nx.console.cloud

import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import dev.nx.console.models.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Service responsible for managing CIPE data state and determining when to show notifications.
 * Compares old and new CIPE data and emits notification events based on VSCode logic.
 */
@Service(Service.Level.PROJECT)
class CIPEDataSyncService(private val project: Project) : Disposable {

    companion object {
        fun getInstance(project: Project): CIPEDataSyncService =
            project.getService(CIPEDataSyncService::class.java)
    }

    private val logger = thisLogger()

    private val _currentData = MutableStateFlow<CIPEDataResponse?>(null)
    val currentData: StateFlow<CIPEDataResponse?> = _currentData.asStateFlow()

    // Keep track of the last valid info data for comparison
    private var lastValidInfo: List<CIPEInfo>? = null

    private val notificationListeners = mutableListOf<CIPENotificationListener>()

    /** Update the CIPE data and check if notifications should be shown */
    fun updateData(newData: CIPEDataResponse) {
        val oldInfo = lastValidInfo

        _currentData.value = newData

        // Update lastValidInfo if we have new info data
        newData.info?.let {
            lastValidInfo = it

            // Check for notification events if we have previous data to compare
            if (oldInfo != null) {
                checkForNotifications(oldInfo, it)
            }
        }
    }

    /** Add a listener for notification events */
    fun addNotificationListener(listener: CIPENotificationListener) {
        notificationListeners.add(listener)
    }

    /** Remove a notification listener */
    fun removeNotificationListener(listener: CIPENotificationListener) {
        notificationListeners.remove(listener)
    }

    /** Check for notification events following VSCode logic */
    private fun checkForNotifications(oldInfo: List<CIPEInfo>, newInfo: List<CIPEInfo>) {
        newInfo.forEach { newCIPE ->
            val oldCIPE = oldInfo.find { it.ciPipelineExecutionId == newCIPE.ciPipelineExecutionId }

            // Check if any runGroup has an AI fix (to skip failure notifications)
            val hasAiFix = newCIPE.runGroups.any { it.aiFix != null }

            // Check for newly available AI fixes and show proactive notifications
            if (oldCIPE != null) {
                checkForNewAiFixNotifications(oldCIPE, newCIPE)
            }

            // Following VSCode logic: if the CIPE has completed or had a failed run before,
            // we've already shown a notification and should return
            if (
                oldCIPE != null &&
                    (oldCIPE.status != CIPEExecutionStatus.IN_PROGRESS || hasAnyFailedRun(oldCIPE))
            ) {
                return@forEach
            }

            // Check what type of notification to emit
            when {
                // CIPE just failed - skip if AI fix available
                newCIPE.status.isFailedStatus() && !hasAiFix -> {
                    emitNotification(CIPENotificationEvent.CIPEFailed(newCIPE))
                }

                // Run failed while CIPE is in progress - skip if AI fix available
                hasAnyFailedRun(newCIPE) && !hasAiFix -> {
                    // Find the first failed run for the notification
                    val failedRun =
                        newCIPE.runGroups.flatMap { it.runs }.firstOrNull { isRunFailed(it) }

                    failedRun?.let {
                        emitNotification(CIPENotificationEvent.RunFailed(newCIPE, it))
                    }
                }

                // CIPE succeeded (only notify if settings allow)
                newCIPE.status == CIPEExecutionStatus.SUCCEEDED -> {
                    emitNotification(CIPENotificationEvent.CIPESucceeded(newCIPE))
                }
            }
        }
    }

    /** Check for newly available AI fixes following VSCode logic */
    private fun checkForNewAiFixNotifications(oldCIPE: CIPEInfo, newCIPE: CIPEInfo) {
        val newCIPERunGroups = newCIPE.runGroups
        val oldCIPERunGroups = oldCIPE.runGroups

        newCIPERunGroups.forEach { newRunGroup ->
            if (newRunGroup.aiFix?.suggestedFix != null) {
                val oldRunGroup = oldCIPERunGroups.find { it.runGroup == newRunGroup.runGroup }
                if (oldRunGroup?.aiFix?.suggestedFix == null) {
                    // AI fix newly available - emit proactive notification
                    emitNotification(CIPENotificationEvent.AiFixAvailable(newCIPE, newRunGroup))
                }
            }
        }
    }

    private fun isRunFailed(run: CIPERun): Boolean {
        return (run.status?.isFailedStatus() == true) ||
            (run.numFailedTasks?.let { it > 0 } == true)
    }

    private fun hasAnyFailedRun(cipe: CIPEInfo): Boolean {
        return cipe.runGroups.any { runGroup -> runGroup.runs.any { run -> isRunFailed(run) } }
    }

    private fun emitNotification(event: CIPENotificationEvent) {
        notificationListeners.forEach { listener ->
            try {
                listener.onNotificationEvent(event)
            } catch (e: Exception) {
                logger.error("Error notifying CIPE notification listener", e)
            }
        }
    }

    override fun dispose() {
        notificationListeners.clear()
    }

    /** Create sample CIPE data with AI fix for testing */
    fun triggerSampleAiFixNotification() {
        val sampleAiFix =
            NxAiFix(
                aiFixId = "test-ai-fix-123",
                taskIds = listOf("app:build", "app:test"),
                terminalLogsUrls =
                    mapOf(
                        "app:build" to "https://nx.app/logs/build",
                        "app:test" to "https://nx.app/logs/test"
                    ),
                suggestedFix =
                    """diff --git a/apps/app/src/main.ts b/apps/app/src/main.ts
index 1234567..abcdefg 100644
--- a/apps/app/src/main.ts
+++ b/apps/app/src/main.ts
@@ -1,5 +1,5 @@
 import { createApp } from './app';
-import { config } from './config;
+import { config } from './config';
 
 const app = createApp(config);
 app.listen(3000);""",
                suggestedFixDescription = "Fix missing quote in import statement",
                verificationStatus = AITaskFixVerificationStatus.COMPLETED,
                userAction = AITaskFixUserAction.NONE
            )

        val sampleRunGroup =
            CIPERunGroup(
                ciExecutionEnv = "github-actions",
                runGroup = "main-linux",
                createdAt = System.currentTimeMillis() - 300000, // 5 minutes ago
                completedAt = System.currentTimeMillis() - 60000, // 1 minute ago
                status = CIPEExecutionStatus.FAILED,
                runs =
                    listOf(
                        CIPERun(
                            linkId = "link-123",
                            executionId = "exec-123",
                            command = "nx affected --target=build --parallel=3",
                            status = CIPEExecutionStatus.FAILED,
                            failedTasks = listOf("app:build", "app:test"),
                            numFailedTasks = 2,
                            numTasks = 10,
                            runUrl = "https://nx.app/runs/123"
                        )
                    ),
                aiFix = sampleAiFix
            )

        val sampleCIPE =
            CIPEInfo(
                branch = "feature/test-branch",
                ciPipelineExecutionId = "test-cipe-123",
                cipeUrl = "https://nx.app/cipes/test-123",
                commitTitle = "Fix import statement",
                commitUrl = "https://github.com/nrwl/nx/commit/abc123",
                createdAt = System.currentTimeMillis() - 300000,
                completedAt = System.currentTimeMillis() - 60000,
                status = CIPEExecutionStatus.FAILED,
                runGroups = listOf(sampleRunGroup)
            )

        // Emit the AI fix notification
        logger.info("Triggering sample AI fix notification")
        emitNotification(CIPENotificationEvent.AiFixAvailable(sampleCIPE, sampleRunGroup))

        // Also update the current data so it can be retrieved later
        val newData = CIPEDataResponse(info = listOf(sampleCIPE), error = null)
        _currentData.value = newData
        lastValidInfo = newData.info
    }
}

/** Represents notification events that should be displayed to the user */
sealed class CIPENotificationEvent {
    data class CIPEFailed(val cipe: CIPEInfo) : CIPENotificationEvent()
    data class RunFailed(val cipe: CIPEInfo, val run: CIPERun) : CIPENotificationEvent()
    data class CIPESucceeded(val cipe: CIPEInfo) : CIPENotificationEvent()
    data class AiFixAvailable(val cipe: CIPEInfo, val runGroup: CIPERunGroup) :
        CIPENotificationEvent()
}

/** Interface for listening to notification events */
fun interface CIPENotificationListener {
    fun onNotificationEvent(event: CIPENotificationEvent)
}

// Extension function to check if a status represents failure
private fun CIPEExecutionStatus.isFailedStatus(): Boolean {
    return this == CIPEExecutionStatus.FAILED ||
        this == CIPEExecutionStatus.CANCELED ||
        this == CIPEExecutionStatus.TIMED_OUT
}
