package dev.nx.console.cloud

import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import dev.nx.console.models.AITaskFixStatus
import dev.nx.console.models.AITaskFixUserAction
import dev.nx.console.models.CIPEDataResponse
import dev.nx.console.models.CIPEExecutionStatus
import dev.nx.console.models.CIPEInfoErrorType
import dev.nx.console.models.NxAiFix
import dev.nx.console.nxls.NxlsService
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Service responsible for polling CIPE data at dynamic intervals. Implements the same polling logic
 * as VSCode:
 * - AI_FIX (10s): When AI fixes are being created/verified (highest priority)
 * - HOT (20s): When CIPEs are in progress
 * - COLD (180s): Normal polling
 * - SLEEP (3600s): When authentication errors occur
 */
@Service(Service.Level.PROJECT)
class CIPEPollingService(private val project: Project, private val cs: CoroutineScope) :
    Disposable {

    companion object {
        private const val SLEEP_POLLING_TIME_MS = 3_600_000L // 1 hour
        private const val COLD_POLLING_TIME_MS = 180_000L // 3 minutes
        private const val HOT_POLLING_TIME_MS = 20_000L // 20 seconds
        private const val AI_FIX_POLLING_TIME_MS = 10_000L // 10 seconds

        fun getInstance(project: Project): CIPEPollingService =
            project.getService(CIPEPollingService::class.java)

        /**
         * Checks if an AI fix is in an active state that requires frequent polling. Returns true
         * only if the fix is still being generated or verified. Mirrors VSCode's isAIFixActive
         * function.
         */
        fun isAIFixActive(aiFix: NxAiFix): Boolean {
            // User has already taken action - fix is no longer active
            if (
                aiFix.userAction == AITaskFixUserAction.APPLIED ||
                    aiFix.userAction == AITaskFixUserAction.REJECTED ||
                    aiFix.userAction == AITaskFixUserAction.APPLIED_AUTOMATICALLY
            ) {
                return false
            }

            // Fix generation failed or not executable - no longer active
            if (
                aiFix.suggestedFixStatus == AITaskFixStatus.FAILED ||
                    aiFix.suggestedFixStatus == AITaskFixStatus.NOT_EXECUTABLE
            ) {
                return false
            }

            // Fix generation still in progress - active
            if (aiFix.suggestedFixStatus != AITaskFixStatus.COMPLETED) {
                return true
            }

            // Generation complete - check if verification is needed
            // Only "code_change" classification (or null for backwards compat) needs verification
            val needsVerification =
                aiFix.failureClassification == "code_change" || aiFix.failureClassification == null

            if (!needsVerification) {
                return false
            }

            // Verification is needed - check if it's complete
            val verificationComplete =
                aiFix.verificationStatus == AITaskFixStatus.COMPLETED ||
                    aiFix.verificationStatus == AITaskFixStatus.FAILED ||
                    aiFix.verificationStatus == AITaskFixStatus.NOT_EXECUTABLE

            return !verificationComplete
        }
    }

    private val logger = thisLogger()

    private var pollingJob: Job? = null
    private var currentPollingInterval = COLD_POLLING_TIME_MS

    private val _currentData = MutableStateFlow<CIPEDataResponse?>(null)
    val currentData: StateFlow<CIPEDataResponse?> = _currentData.asStateFlow()

    private val _isPolling = MutableStateFlow(false)
    val isPolling: StateFlow<Boolean> = _isPolling.asStateFlow()

    // Listeners for data changes
    private val dataChangeListeners = mutableListOf<CIPEDataChangeListener>()

    /** Start polling for CIPE data */
    fun startPolling() {
        if (pollingJob?.isActive == true) {
            logger.debug("CIPE polling already active")
            return
        }

        logger.info("Starting CIPE polling with initial interval: ${currentPollingInterval}ms")
        _isPolling.value = true

        pollingJob =
            cs.launch {
                while (isActive) {
                    try {
                        pollCIPEData()
                        delay(currentPollingInterval)
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        logger.error("Error during CIPE polling", e)
                        delay(currentPollingInterval)
                    }
                }
            }
    }

    /** Stop polling for CIPE data */
    fun stopPolling() {
        logger.info("Stopping CIPE polling")
        pollingJob?.cancel()
        pollingJob = null
        _isPolling.value = false
    }

    /** Force an immediate poll, useful for user-triggered refreshes */
    fun forcePoll() {
        logger.debug("Force polling CIPE data")
        cs.launch { pollCIPEData() }
    }

    /** Add a listener for CIPE data changes */
    fun addDataChangeListener(listener: CIPEDataChangeListener) {
        dataChangeListeners.add(listener)
    }

    /** Remove a data change listener */
    fun removeDataChangeListener(listener: CIPEDataChangeListener) {
        dataChangeListeners.remove(listener)
    }

    private suspend fun pollCIPEData() {
        try {
            val nxlsService = NxlsService.getInstance(project)
            val newData = nxlsService.recentCIPEData()

            if (newData != null) {
                val oldData = _currentData.value
                _currentData.value = newData
                updatePollingInterval(newData)

                // Emit data change event
                if (oldData?.info != null || newData.info != null) {
                    val event = CIPEDataChangedEvent(oldData, newData)
                    notifyListeners(event)
                }
            }
        } catch (e: Exception) {
            logger.error("[CIPE_POLL] Failed to poll CIPE data: ${e.message}", e)
        }
    }

    /**
     * Update polling interval based on CIPE data state Following the same logic as VSCode:
     * - SLEEP if authentication error
     * - AI_FIX if any AI fixes are being created/verified (takes precedence)
     * - HOT if any CIPE is in progress
     * - COLD otherwise
     */
    private fun updatePollingInterval(data: CIPEDataResponse) {
        val newInterval =
            when {
                // Authentication error - slow down polling
                data.error?.type == CIPEInfoErrorType.authentication -> {
                    logger.debug("Authentication error detected, switching to SLEEP polling")
                    SLEEP_POLLING_TIME_MS
                }

                // AI fixes in progress - ultra-fast polling
                data.info?.any { cipe ->
                    cipe.runGroups.any { rg -> rg.aiFix?.let { isAIFixActive(it) } ?: false }
                } == true -> {
                    logger.debug("AI fixes in progress detected, switching to AI_FIX polling")
                    AI_FIX_POLLING_TIME_MS
                }

                // Any CIPE in progress - speed up polling
                data.info?.any { it.status == CIPEExecutionStatus.IN_PROGRESS } == true -> {
                    logger.debug("Active CIPEs detected, switching to HOT polling")
                    HOT_POLLING_TIME_MS
                }

                // Normal state
                else -> {
                    logger.debug("No active CIPEs or AI fixes, switching to COLD polling")
                    COLD_POLLING_TIME_MS
                }
            }

        if (newInterval != currentPollingInterval) {
            logger.info(
                "Polling interval changed from ${currentPollingInterval}ms to ${newInterval}ms"
            )
            currentPollingInterval = newInterval
        }
    }

    private fun notifyListeners(event: CIPEDataChangedEvent) {
        dataChangeListeners.forEach { listener ->
            try {
                listener.onDataChanged(event)
            } catch (e: Exception) {
                logger.error("[CIPE_POLL] Error notifying data change listener: ${e.message}", e)
            }
        }
    }

    override fun dispose() {
        stopPolling()
        dataChangeListeners.clear()
    }
}

/** Event emitted when CIPE data changes */
data class CIPEDataChangedEvent(val oldData: CIPEDataResponse?, val newData: CIPEDataResponse)

/** Interface for listening to CIPE data changes */
fun interface CIPEDataChangeListener {
    fun onDataChanged(event: CIPEDataChangedEvent)
}
