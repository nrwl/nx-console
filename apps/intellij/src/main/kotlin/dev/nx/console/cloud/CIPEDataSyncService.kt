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

    /**
     * Update the CIPE data and check if notifications should be shown
     */
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

    /**
     * Check for notification events following VSCode logic
     */
    private fun checkForNotifications(oldInfo: List<CIPEInfo>, newInfo: List<CIPEInfo>) {
        newInfo.forEach { newCIPE ->
            val oldCIPE = oldInfo.find { it.ciPipelineExecutionId == newCIPE.ciPipelineExecutionId }
            
            // Following VSCode logic: if the CIPE has completed or had a failed run before,
            // we've already shown a notification and should return
            if (oldCIPE != null && (oldCIPE.status != CIPEExecutionStatus.IN_PROGRESS || hasAnyFailedRun(oldCIPE))) {
                return@forEach
            }
            
            // Check what type of notification to emit
            when {
                // CIPE just failed
                newCIPE.status.isFailedStatus() -> {
                    emitNotification(CIPENotificationEvent.CIPEFailed(newCIPE))
                }
                
                // Run failed while CIPE is in progress
                hasAnyFailedRun(newCIPE) -> {
                    // Find the first failed run for the notification
                    val failedRun = newCIPE.runGroups
                        .flatMap { it.runs }
                        .firstOrNull { isRunFailed(it) }
                    
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


    private fun isRunFailed(run: CIPERun): Boolean {
        return (run.status?.isFailedStatus() == true) ||
            (run.numFailedTasks?.let { it > 0 } == true)
    }

    private fun hasAnyFailedRun(cipe: CIPEInfo): Boolean {
        return cipe.runGroups.any { runGroup ->
            runGroup.runs.any { run -> isRunFailed(run) }
        }
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
}

/** Represents notification events that should be displayed to the user */
sealed class CIPENotificationEvent {
    data class CIPEFailed(val cipe: CIPEInfo) : CIPENotificationEvent()
    data class RunFailed(val cipe: CIPEInfo, val run: CIPERun) : CIPENotificationEvent()
    data class CIPESucceeded(val cipe: CIPEInfo) : CIPENotificationEvent()
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
