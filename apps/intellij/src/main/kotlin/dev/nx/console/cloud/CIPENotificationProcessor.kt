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
    }

    private val logger = thisLogger()
    private val notificationListeners = mutableListOf<CIPENotificationListener>()

    /** Add a listener for notification events */
    fun addNotificationListener(listener: CIPENotificationListener) {
        notificationListeners.add(listener)
    }

    /** Remove a notification listener */
    fun removeNotificationListener(listener: CIPENotificationListener) {
        notificationListeners.remove(listener)
    }

    override fun onDataChanged(event: CIPEDataChangedEvent) {
        logger.debug("[CIPE_PROCESSOR] Processing CIPE data change")

        val oldInfo = event.oldData?.info
        val newInfo = event.newData.info

        if (newInfo == null) {
            logger.debug("[CIPE_PROCESSOR] New data has no info, skipping processing")
            return
        }

        if (oldInfo == null) {
            logger.debug(
                "[CIPE_PROCESSOR] No previous data to compare, skipping notification check"
            )
            return
        }

        logger.info(
            "[CIPE_PROCESSOR] Comparing ${oldInfo.size} old CIPEs with ${newInfo.size} new CIPEs for notifications"
        )
        checkForNotifications(oldInfo, newInfo)
    }

    /** Check for notification events following VSCode logic */
    private fun checkForNotifications(oldInfo: List<CIPEInfo>, newInfo: List<CIPEInfo>) {
        logger.debug("[CIPE_PROCESSOR] Starting notification check for ${newInfo.size} CIPEs")

        newInfo.forEach { newCIPE ->
            logger.debug(
                "[CIPE_PROCESSOR] Checking CIPE ${newCIPE.ciPipelineExecutionId}: " +
                    "status=${newCIPE.status}, branch=${newCIPE.branch ?: "unknown"}"
            )

            val oldCIPE = oldInfo.find { it.ciPipelineExecutionId == newCIPE.ciPipelineExecutionId }
            logger.debug(
                "[CIPE_PROCESSOR] Old CIPE found: ${oldCIPE != null}, " +
                    "old status: ${oldCIPE?.status ?: "N/A"}"
            )

            // Check if any runGroup has an AI fix (to skip failure notifications)
            val hasAiFix = newCIPE.runGroups.any { it.aiFix != null }
            logger.debug("[CIPE_PROCESSOR] CIPE has AI fix: $hasAiFix")

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
                logger.debug(
                    "[CIPE_PROCESSOR] Skipping notification - CIPE already completed/failed previously"
                )
                return@forEach
            }

            // Check what type of notification to emit
            when {
                // CIPE just failed - skip if AI fix available
                newCIPE.status.isFailedStatus() && !hasAiFix -> {
                    logger.info(
                        "[CIPE_PROCESSOR] Emitting CIPEFailed notification for ${newCIPE.ciPipelineExecutionId}"
                    )
                    emitNotification(CIPENotificationEvent.CIPEFailed(newCIPE))
                }

                // Run failed while CIPE is in progress - skip if AI fix available
                hasAnyFailedRun(newCIPE) && !hasAiFix -> {
                    // Find the first failed run for the notification
                    val failedRun =
                        newCIPE.runGroups.flatMap { it.runs }.firstOrNull { isRunFailed(it) }

                    failedRun?.let {
                        logger.info(
                            "[CIPE_PROCESSOR] Emitting RunFailed notification for " +
                                "CIPE ${newCIPE.ciPipelineExecutionId}, run ${it.linkId}"
                        )
                        emitNotification(CIPENotificationEvent.RunFailed(newCIPE, it))
                    }
                }

                // CIPE succeeded (only notify if settings allow)
                newCIPE.status == CIPEExecutionStatus.SUCCEEDED -> {
                    logger.info(
                        "[CIPE_PROCESSOR] Emitting CIPESucceeded notification for ${newCIPE.ciPipelineExecutionId}"
                    )
                    emitNotification(CIPENotificationEvent.CIPESucceeded(newCIPE))
                }
                else -> {
                    logger.debug(
                        "[CIPE_PROCESSOR] No notification needed for CIPE ${newCIPE.ciPipelineExecutionId}"
                    )
                }
            }
        }
    }

    /** Check for newly available AI fixes following VSCode logic */
    private fun checkForNewAiFixNotifications(oldCIPE: CIPEInfo, newCIPE: CIPEInfo) {
        logger.debug(
            "[CIPE_PROCESSOR] Checking for new AI fixes in CIPE ${newCIPE.ciPipelineExecutionId}"
        )
        val newCIPERunGroups = newCIPE.runGroups
        val oldCIPERunGroups = oldCIPE.runGroups

        newCIPERunGroups.forEach { newRunGroup ->
            logger.debug(
                "[CIPE_PROCESSOR] Checking run group ${newRunGroup.runGroup}: " +
                    "has AI fix: ${newRunGroup.aiFix != null}"
            )

            if (newRunGroup.aiFix?.suggestedFix != null) {
                val oldRunGroup = oldCIPERunGroups.find { it.runGroup == newRunGroup.runGroup }
                logger.debug(
                    "[CIPE_PROCESSOR] Old run group found: ${oldRunGroup != null}, " +
                        "had AI fix: ${oldRunGroup?.aiFix?.suggestedFix != null}"
                )

                if (oldRunGroup?.aiFix?.suggestedFix == null) {
                    // AI fix newly available - emit proactive notification
                    logger.info(
                        "[CIPE_PROCESSOR] New AI fix available! Emitting AiFixAvailable notification " +
                            "for CIPE ${newCIPE.ciPipelineExecutionId}, run group ${newRunGroup.runGroup}"
                    )
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
        logger.debug(
            "[CIPE_PROCESSOR] Emitting notification event: ${event::class.simpleName} " +
                "to ${notificationListeners.size} listeners"
        )

        notificationListeners.forEachIndexed { index, listener ->
            try {
                logger.debug("[CIPE_PROCESSOR] Notifying listener #$index")
                listener.onNotificationEvent(event)
            } catch (e: Exception) {
                logger.error(
                    "[CIPE_PROCESSOR] Error notifying CIPE notification listener #$index: ${e.message}",
                    e
                )
            }
        }
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
