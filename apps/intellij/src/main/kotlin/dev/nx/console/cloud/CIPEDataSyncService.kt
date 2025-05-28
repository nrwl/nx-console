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
 * Service responsible for managing CIPE data state and detecting changes. Compares old and new CIPE
 * data to identify what changed and notifies listeners.
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

    private val changeListeners = mutableListOf<CIPEChangeListener>()

    /**
     * Update the CIPE data and detect changes
     *
     * @return List of changes detected
     */
    fun updateData(newData: CIPEDataResponse): List<CIPEChange> {
        val oldData = _currentData.value
        val changes = detectChanges(oldData, newData)

        _currentData.value = newData

        // Update lastValidInfo if we have new info data
        newData.info?.let { lastValidInfo = it }

        // Notify all listeners of changes
        changes.forEach { change -> notifyListeners(change) }

        return changes
    }

    /** Add a listener for CIPE changes */
    fun addChangeListener(listener: CIPEChangeListener) {
        changeListeners.add(listener)
    }

    /** Remove a change listener */
    fun removeChangeListener(listener: CIPEChangeListener) {
        changeListeners.remove(listener)
    }

    /** Detect changes between old and new CIPE data */
    private fun detectChanges(old: CIPEDataResponse?, new: CIPEDataResponse): List<CIPEChange> {
        val changes = mutableListOf<CIPEChange>()

        // If we don't have new info data, nothing to check
        val newInfo = new.info ?: return changes

        // On initial load (lastValidInfo is null), we don't send notifications
        // This matches VSCode behavior
        val oldInfo = lastValidInfo ?: return changes

        // Check each CIPE for status changes
        newInfo.forEach { newCIPE ->
            val oldCIPE = oldInfo.find { it.ciPipelineExecutionId == newCIPE.ciPipelineExecutionId }

            when {
                // New CIPE
                oldCIPE == null -> {
                    changes.add(CIPEChange.NewCIPE(newCIPE))
                }

                // Status changed
                oldCIPE.status != newCIPE.status -> {
                    changes.add(CIPEChange.StatusChanged(oldCIPE, newCIPE))

                    // Check if it just completed
                    if (!isCompleteStatus(oldCIPE.status) && isCompleteStatus(newCIPE.status)) {
                        changes.add(CIPEChange.CIPECompleted(newCIPE))
                    }
                }

                // Check for new failed runs
                else -> {
                    val newFailedRuns = findNewFailedRuns(oldCIPE, newCIPE)
                    newFailedRuns.forEach { run -> changes.add(CIPEChange.RunFailed(newCIPE, run)) }
                }
            }
        }

        return changes
    }

    /** Find runs that have newly failed */
    private fun findNewFailedRuns(old: CIPEInfo, new: CIPEInfo): List<CIPERun> {
        val newFailedRuns = mutableListOf<CIPERun>()

        new.runGroups.forEach { newRunGroup ->
            val oldRunGroup =
                old.runGroups.find {
                    it.runGroup == newRunGroup.runGroup &&
                        it.ciExecutionEnv == newRunGroup.ciExecutionEnv
                }

            newRunGroup.runs.forEach { newRun ->
                val oldRun =
                    oldRunGroup?.runs?.find {
                        it.linkId == newRun.linkId || it.executionId == newRun.executionId
                    }

                val newRunFailed = isRunFailed(newRun)
                val oldRunFailed = oldRun?.let { isRunFailed(it) } ?: false

                if (newRunFailed && !oldRunFailed) {
                    newFailedRuns.add(newRun)
                }
            }
        }

        return newFailedRuns
    }

    private fun isRunFailed(run: CIPERun): Boolean {
        return (run.status != null && isFailedStatus(run.status)) ||
            (run.numFailedTasks != null && run.numFailedTasks > 0)
    }

    private fun isCompleteStatus(status: CIPEExecutionStatus): Boolean {
        return when (status) {
            CIPEExecutionStatus.SUCCEEDED,
            CIPEExecutionStatus.FAILED,
            CIPEExecutionStatus.CANCELED,
            CIPEExecutionStatus.TIMED_OUT -> true
            else -> false
        }
    }

    private fun isFailedStatus(status: CIPEExecutionStatus): Boolean {
        return status == CIPEExecutionStatus.FAILED ||
            status == CIPEExecutionStatus.CANCELED ||
            status == CIPEExecutionStatus.TIMED_OUT
    }

    private fun notifyListeners(change: CIPEChange) {
        changeListeners.forEach { listener ->
            try {
                listener.onCIPEChange(change)
            } catch (e: Exception) {
                logger.error("Error notifying CIPE change listener", e)
            }
        }
    }

    override fun dispose() {
        changeListeners.clear()
    }
}

/** Represents different types of CIPE changes */
sealed class CIPEChange {
    data class NewCIPE(val cipe: CIPEInfo) : CIPEChange()

    data class StatusChanged(val oldCIPE: CIPEInfo, val newCIPE: CIPEInfo) : CIPEChange()

    data class CIPECompleted(val cipe: CIPEInfo) : CIPEChange()

    data class RunFailed(val cipe: CIPEInfo, val run: CIPERun) : CIPEChange()
}

/** Interface for listening to CIPE changes */
fun interface CIPEChangeListener {
    fun onCIPEChange(change: CIPEChange)
}
