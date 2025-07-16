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
            val oldCIPE = oldInfo.find { it.ciPipelineExecutionId == newCIPE.ciPipelineExecutionId }

            // Check if any runGroup has an AI fix (to skip failure notifications)
            val hasAiFix = newCIPE.runGroups.any { it.aiFix != null }

            // Check for newly available AI fixes and show proactive notifications
            if (oldCIPE != null) {
                checkForNewAiFixNotifications(oldCIPE, newCIPE)
            } else {
                // If this is a new CIPE but it has an AI fix that's already complete, show a
                // notification
                if (hasAiFix) {
                    newCIPE.runGroups.forEach { runGroup ->
                        if (runGroup.aiFix?.suggestedFix != null) {
                            emitNotification(
                                CIPENotificationEvent.AiFixAvailable(newCIPE, runGroup)
                            )
                        }
                    }
                }
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

        val newCIPERunGroups = newCIPE.runGroups
        val oldCIPERunGroups = oldCIPE.runGroups

        newCIPERunGroups.forEach { newRunGroup ->
            if (
                newRunGroup.aiFix?.suggestedFix != null &&
                    newRunGroup.aiFix?.suggestedFixStatus != AITaskFixStatus.NOT_STARTED
            ) {
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
        logger.debug(
            "[CIPE_PROCESSOR] Emitting notification event: ${event::class.simpleName} " +
                "to ${notificationListeners.size} listeners"
        )

        notificationListeners.forEach { listener ->
            try {
                listener.onNotificationEvent(event)
            } catch (e: Exception) {
                logger.error(
                    "[CIPE_PROCESSOR] Error notifying CIPE notification listener: ${e.message}",
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
