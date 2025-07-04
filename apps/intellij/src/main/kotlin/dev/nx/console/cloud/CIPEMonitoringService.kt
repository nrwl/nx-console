package dev.nx.console.cloud

import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import dev.nx.console.nxls.NxlsService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Service responsible for coordinating CIPE monitoring components. Initializes polling and connects
 * notification handlers.
 */
@Service(Service.Level.PROJECT)
class CIPEMonitoringService(private val project: Project, private val cs: CoroutineScope) :
    Disposable {

    companion object {
        fun getInstance(project: Project): CIPEMonitoringService =
            project.getService(CIPEMonitoringService::class.java)
    }

    private val logger = thisLogger()
    private var isInitialized = false

    /** Initialize CIPE monitoring after Nxls has started */
    fun init() {
        logger.info("[CIPE_MONITOR] Init called - current initialized state: $isInitialized")
        
        if (isInitialized) {
            logger.debug("[CIPE_MONITOR] CIPE monitoring already initialized, skipping")
            return
        }

        cs.launch {
            try {
                logger.debug("[CIPE_MONITOR] Checking cloud connection status")
                
                // Check if workspace is connected to Nx Cloud
                val cloudStatus = NxlsService.getInstance(project).cloudStatus()
                logger.debug("[CIPE_MONITOR] Cloud status received - " +
                    "isConnected: ${cloudStatus?.isConnected}, " +
                    "nxCloudUrl: ${cloudStatus?.nxCloudUrl ?: "none"}")

                if (cloudStatus?.isConnected == true) {
                    logger.info("[CIPE_MONITOR] Nx Cloud is connected, initializing CIPE monitoring")

                    // Get services
                    logger.debug("[CIPE_MONITOR] Getting service instances")
                    val pollingService = CIPEPollingService.getInstance(project)
                    val dataSyncService = CIPEDataSyncService.getInstance(project)
                    val notificationService = CIPENotificationService.getInstance(project)

                    // Connect notification service to data sync
                    logger.debug("[CIPE_MONITOR] Connecting notification service to data sync")
                    dataSyncService.addNotificationListener(notificationService)

                    // Start polling
                    logger.info("[CIPE_MONITOR] Starting CIPE polling service")
                    pollingService.startPolling()

                    isInitialized = true
                    logger.info("[CIPE_MONITOR] CIPE monitoring initialized successfully")
                } else {
                    logger.info("[CIPE_MONITOR] Nx Cloud not connected (isConnected=${cloudStatus?.isConnected}), " +
                        "skipping CIPE monitoring initialization")
                }
            } catch (e: Exception) {
                logger.error("[CIPE_MONITOR] Failed to initialize CIPE monitoring: ${e.message}", e)
            }
        }
    }

    /** Stop CIPE monitoring */
    fun stop() {
        logger.info("[CIPE_MONITOR] Stop called - current initialized state: $isInitialized")
        
        if (!isInitialized) {
            logger.debug("[CIPE_MONITOR] CIPE monitoring not initialized, nothing to stop")
            return
        }

        logger.info("[CIPE_MONITOR] Stopping CIPE monitoring")

        val pollingService = CIPEPollingService.getInstance(project)
        logger.debug("[CIPE_MONITOR] Stopping polling service")
        pollingService.stopPolling()

        isInitialized = false
        logger.info("[CIPE_MONITOR] CIPE monitoring stopped successfully")
    }

    override fun dispose() {
        logger.debug("[CIPE_MONITOR] Disposing CIPEMonitoringService")
        stop()
    }
}
