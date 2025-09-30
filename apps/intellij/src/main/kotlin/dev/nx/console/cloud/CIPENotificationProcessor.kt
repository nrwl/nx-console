package dev.nx.console.cloud

import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import dev.nx.console.models.*

/**
 * Stateless service that processes CIPE data changes and determines which notifications to emit.
 * This service contains the business logic for comparing old and new CIPE data and emitting
 * appropriate notification events, following the same logic as VSCode.
 */
@Service(Service.Level.PROJECT)
class CIPENotificationProcessor(private val project: Project) : Disposable, CIPEDataChangeListener {

    companion object {
        fun getInstance(project: Project): CIPENotificationProcessor =
            project.getService(CIPENotificationProcessor::class.java)

        // When a CIPE fails, we will wait up to five minutes for an AI fix to become available
        // during that time, we don't show failure notifications
        private const val AI_FIX_WAIT_TIME_MS = 1000L * 60 * 5
    }

    private val logger = thisLogger()
    private val notificationListeners = mutableListOf<CIPENotificationListener>()
    private val sentNotifications = mutableSetOf<String>()

    /** Add a listener for notification events */
    fun addNotificationListener(listener: CIPENotificationListener) {
        notificationListeners.add(listener)
    }

    /** Remove a notification listener */
    fun removeNotificationListener(listener: CIPENotificationListener) {
        notificationListeners.remove(listener)
    }

    override fun onDataChanged(event: CIPEDataChangedEvent) {
        val oldInfo = event.oldData?.info
        val newInfo = event.newData.info

        if (newInfo == null) {
            return
        }

        if (oldInfo == null) {
            return
        }

        checkForNotifications(oldInfo, newInfo)
    }

    /** Check for notification events following VSCode logic */
    private fun checkForNotifications(oldInfo: List<CIPEInfo>, newInfo: List<CIPEInfo>) {

        newInfo.forEach { newCIPE ->
            val cipeId = newCIPE.ciPipelineExecutionId

            val oldCIPE = oldInfo.find { it.ciPipelineExecutionId == cipeId }

            // Process AI fix notifications
            processAIFixNotifications(oldCIPE, newCIPE)

            // Check if we should show CIPE notifications
            val couldShow = couldShowCIPENotification(oldCIPE, newCIPE)
            if (!couldShow) {
                return@forEach
            }

            // Should we wait for AI fix?
            val shouldWaitForAiFix =
                newCIPE.aiFixesEnabled == true && !hasPassedAiFixWaitTime(newCIPE)

            if (shouldWaitForAiFix) {
                return@forEach
            }

            // Check what type of notification to emit
            when {
                // CIPE succeeded
                newCIPE.status == CIPEExecutionStatus.SUCCEEDED -> {
                    emitNotification(CIPENotificationEvent.CIPESucceeded(newCIPE))
                }

                // CIPE failed
                newCIPE.status.isFailedStatus() -> {
                    emitNotification(CIPENotificationEvent.CIPEFailed(newCIPE))
                }

                // Run failed while CIPE is in progress
                newCIPE.status == CIPEExecutionStatus.IN_PROGRESS && hasAnyFailedRun(newCIPE) -> {
                    val failedRun =
                        newCIPE.runGroups.flatMap { it.runs }.firstOrNull { isRunFailed(it) }
                    failedRun?.let {
                        emitNotification(CIPENotificationEvent.RunFailed(newCIPE, it))
                    }
                }
            }
        }
    }

    /** Process AI fix notifications */
    private fun processAIFixNotifications(oldCIPE: CIPEInfo?, newCIPE: CIPEInfo) {
        val runGroupsToProcess: List<CIPERunGroup> =
            if (oldCIPE != null) {
                findRunGroupsWithNewAiFixes(newCIPE.runGroups, oldCIPE.runGroups)
            } else {
                // No old CIPE - process AI fix notification for any existing AI fixes
                newCIPE.runGroups
            }

        runGroupsToProcess
            .filter {
                it.aiFix?.suggestedFix != null &&
                    it.aiFix?.suggestedFixStatus != AITaskFixStatus.NOT_STARTED
            }
            .forEach { runGroup ->
                // If auto apply is enabled, wait for verification to complete
                if (
                    runGroup.aiFix?.couldAutoApplyTasks == true &&
                        runGroup.aiFix?.verificationStatus != AITaskFixStatus.COMPLETED
                ) {
                    return@forEach
                }

                emitNotification(CIPENotificationEvent.AiFixAvailable(newCIPE, runGroup))
            }
    }

    /** Find run groups with newly available AI fixes or changed user actions */
    private fun findRunGroupsWithNewAiFixes(
        newRunGroups: List<CIPERunGroup>,
        oldRunGroups: List<CIPERunGroup>
    ): List<CIPERunGroup> {
        return newRunGroups.filter { newRunGroup ->
            val oldRunGroup = oldRunGroups.find { it.runGroup == newRunGroup.runGroup }

            // Trigger if there's no old AI fix, or if userAction has changed
            val hasNewFix =
                oldRunGroup?.aiFix?.suggestedFix == null && newRunGroup.aiFix?.suggestedFix != null
            val hasUserActionChange =
                oldRunGroup?.aiFix?.userAction != newRunGroup.aiFix?.userAction

            hasNewFix || hasUserActionChange
        }
    }

    /** Check if we could show a CIPE notification */
    private fun couldShowCIPENotification(oldCIPE: CIPEInfo?, newCIPE: CIPEInfo): Boolean {
        // If there's no old CIPE, this is a new CIPE appearing in our list
        if (oldCIPE == null) {
            // For new CIPEs, we could show notifications if:
            // 1. It's completed/failed (not IN_PROGRESS)
            // 2. OR it's IN_PROGRESS but has failed runs
            return newCIPE.status != CIPEExecutionStatus.IN_PROGRESS || hasAnyFailedRun(newCIPE)
        }

        // Don't send notifications for status changes that would've triggered a notification in the
        // past
        val oldCipeHadNotifiableState =
            oldCIPE.status != CIPEExecutionStatus.IN_PROGRESS || hasAnyFailedRun(oldCIPE)

        if (oldCipeHadNotifiableState) {
            // The one exception is if the CIPE was previously suppressed
            val wasSuppressed = shouldSuppressCIPEFailureNotification(oldCIPE)
            val isNoLongerSuppressed = !shouldSuppressCIPEFailureNotification(newCIPE)
            val hasPassedWaitTime = hasPassedAiFixWaitTime(newCIPE)

            return wasSuppressed && isNoLongerSuppressed && hasPassedWaitTime
        } else {
            return true
        }
    }

    /** Check if we've passed the wait time for AI fixes */
    private fun hasPassedAiFixWaitTime(cipe: CIPEInfo): Boolean {
        val completedAt = cipe.completedAt ?: return false

        return cipe.status.isFailedStatus() &&
            !hasAnyAiFix(cipe.runGroups) &&
            completedAt + AI_FIX_WAIT_TIME_MS < System.currentTimeMillis()
    }

    /** Check if we should suppress CIPE failure notifications */
    private fun shouldSuppressCIPEFailureNotification(cipe: CIPEInfo): Boolean {
        return hasAnyAiFix(cipe.runGroups) ||
            (cipe.aiFixesEnabled == true && !hasPassedAiFixWaitTime(cipe))
    }

    /** Check if any run group has an AI fix */
    private fun hasAnyAiFix(runGroups: List<CIPERunGroup>): Boolean {
        return runGroups.any { it.aiFix != null }
    }

    private fun isRunFailed(run: CIPERun): Boolean {
        return (run.status?.isFailedStatus() == true) ||
            (run.numFailedTasks?.let { it > 0 } == true)
    }

    private fun hasAnyFailedRun(cipe: CIPEInfo): Boolean {
        return cipe.runGroups.any { runGroup -> runGroup.runs.any { run -> isRunFailed(run) } }
    }

    private fun emitNotification(event: CIPENotificationEvent) {
        if (sentNotifications.contains(event.cipe.ciPipelineExecutionId)) {
            return
        }
        notificationListeners.forEach { listener ->
            try {
                listener.onNotificationEvent(event)
            } catch (e: Exception) {
                logger.error(
                    "[CIPE_PROCESSOR] Error notifying CIPE notification listener: ${e.message}",
                    e,
                )
            }
        }
        sentNotifications.add(event.cipe.ciPipelineExecutionId)
    }

    override fun dispose() {
        notificationListeners.clear()
    }
}

// Extension function to check if a status represents failure
private fun CIPEExecutionStatus.isFailedStatus(): Boolean {
    return this == CIPEExecutionStatus.FAILED ||
        this == CIPEExecutionStatus.CANCELED ||
        this == CIPEExecutionStatus.TIMED_OUT
}
