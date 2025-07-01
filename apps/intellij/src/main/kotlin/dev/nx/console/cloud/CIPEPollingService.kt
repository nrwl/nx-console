package dev.nx.console.cloud

import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import dev.nx.console.models.AITaskFixVerificationStatus
import dev.nx.console.models.CIPEDataResponse
import dev.nx.console.models.CIPEExecutionStatus
import dev.nx.console.models.CIPEInfoErrorType
import dev.nx.console.nxls.NxlsService
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Service responsible for polling CIPE data at dynamic intervals. Implements the same polling logic
 * as VSCode:
 * - AI_FIX (3s): When AI fixes are being created/verified (highest priority)
 * - HOT (10s): When CIPEs are in progress
 * - COLD (180s): Normal polling
 * - SLEEP (3600s): When authentication errors occur
 */
@Service(Service.Level.PROJECT)
class CIPEPollingService(private val project: Project, private val cs: CoroutineScope) :
    Disposable {

    companion object {
        private const val SLEEP_POLLING_TIME_MS = 3_600_000L // 1 hour
        private const val COLD_POLLING_TIME_MS = 180_000L // 3 minutes
        private const val HOT_POLLING_TIME_MS = 10_000L // 10 seconds
        private const val AI_FIX_POLLING_TIME_MS = 3_000L // 3 seconds

        fun getInstance(project: Project): CIPEPollingService =
            project.getService(CIPEPollingService::class.java)
    }

    private val logger = thisLogger()

    private var pollingJob: Job? = null
    private var currentPollingInterval = COLD_POLLING_TIME_MS

    private val _latestCIPEData = MutableStateFlow<CIPEDataResponse?>(null)
    val latestCIPEData: StateFlow<CIPEDataResponse?> = _latestCIPEData.asStateFlow()

    private val _isPolling = MutableStateFlow(false)
    val isPolling: StateFlow<Boolean> = _isPolling.asStateFlow()

    // Listeners for data updates
    private val dataUpdateListeners = mutableListOf<(CIPEDataResponse) -> Unit>()

    /** Start polling for CIPE data */
    fun startPolling() {
        if (pollingJob?.isActive == true) {
            logger.debug("CIPE polling already active")
            return
        }

        logger.info("Starting CIPE polling")
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
    suspend fun forcePoll() {
        logger.debug("Force polling CIPE data")
        pollCIPEData()
    }

    /** Add a listener for CIPE data updates */
    fun addDataUpdateListener(listener: (CIPEDataResponse) -> Unit) {
        dataUpdateListeners.add(listener)
    }

    /** Remove a data update listener */
    fun removeDataUpdateListener(listener: (CIPEDataResponse) -> Unit) {
        dataUpdateListeners.remove(listener)
    }

    private suspend fun pollCIPEData() {
        try {
            val nxlsService = NxlsService.getInstance(project)
            val cipeData = nxlsService.recentCIPEData()

            if (cipeData != null) {
                _latestCIPEData.value = cipeData
                updatePollingInterval(cipeData)

                // Update data sync service
                val dataSyncService = CIPEDataSyncService.getInstance(project)
                dataSyncService.updateData(cipeData)

                notifyListeners(cipeData)
            }
        } catch (e: Exception) {
            logger.error("Failed to poll CIPE data", e)
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
                    cipe.runGroups.any { rg ->
                        rg.aiFix?.let { aiFix ->
                            aiFix.verificationStatus == AITaskFixVerificationStatus.NOT_STARTED ||
                                aiFix.verificationStatus == AITaskFixVerificationStatus.IN_PROGRESS
                        }
                            ?: false
                    }
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

    private fun notifyListeners(data: CIPEDataResponse) {
        dataUpdateListeners.forEach { listener ->
            try {
                listener(data)
            } catch (e: Exception) {
                logger.error("Error notifying CIPE data listener", e)
            }
        }
    }

    override fun dispose() {
        stopPolling()
        dataUpdateListeners.clear()
    }
}
