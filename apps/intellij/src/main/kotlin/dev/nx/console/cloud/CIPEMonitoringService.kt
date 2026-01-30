package dev.nx.console.cloud

import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import dev.nx.console.nxls.NxlsService
import dev.nx.console.utils.NxConsoleLogger
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

    private val logger = NxConsoleLogger.getInstance()
    private var isInitialized = false

    /** Initialize CIPE monitoring after Nxls has started */
    fun init() {
        logger.log("[CIPE_MONITOR] Init called - current initialized state: $isInitialized")

        if (isInitialized) {
            logger.log("[CIPE_MONITOR] CIPE monitoring already initialized, skipping")
            return
        }

        cs.launch {
            try {
                logger.log("[CIPE_MONITOR] Checking cloud connection status")

                // Check if workspace is connected to Nx Cloud
                val cloudStatus = NxlsService.getInstance(project).cloudStatus()
                logger.log(
                    "[CIPE_MONITOR] Cloud status received - " +
                        "isConnected: ${cloudStatus?.isConnected}, " +
                        "nxCloudUrl: ${cloudStatus?.nxCloudUrl ?: "none"}"
                )

                if (cloudStatus?.isConnected == true) {
                    logger.log("[CIPE_MONITOR] Nx Cloud is connected, initializing CIPE monitoring")

                    // Get services
                    logger.log("[CIPE_MONITOR] Getting service instances")
                    val pollingService = CIPEPollingService.getInstance(project)
                    val notificationProcessor = CIPENotificationProcessor.getInstance(project)
                    val notificationService = CIPENotificationService.getInstance(project)

                    // Wire up the data flow pipeline:
                    // PollingService -> NotificationProcessor -> NotificationService
                    logger.log("[CIPE_MONITOR] Wiring up data flow pipeline")
                    pollingService.addDataChangeListener(notificationProcessor)
                    notificationProcessor.addNotificationListener(notificationService)

                    // Start polling
                    logger.log("[CIPE_MONITOR] Starting CIPE polling service")
                    pollingService.startPolling()

                    isInitialized = true
                    logger.log("[CIPE_MONITOR] CIPE monitoring initialized successfully")
                } else {
                    logger.log(
                        "[CIPE_MONITOR] Nx Cloud not connected (isConnected=${cloudStatus?.isConnected}), " +
                            "skipping CIPE monitoring initialization"
                    )
                }
            } catch (e: Exception) {
                logger.log("[CIPE_MONITOR] Failed to initialize CIPE monitoring: ${e.message}")
            }
        }
    }

    /** Stop CIPE monitoring */
    fun stop() {
        logger.log("[CIPE_MONITOR] Stop called - current initialized state: $isInitialized")

        if (!isInitialized) {
            logger.log("[CIPE_MONITOR] CIPE monitoring not initialized, nothing to stop")
            return
        }

        logger.log("[CIPE_MONITOR] Stopping CIPE monitoring")

        val pollingService = CIPEPollingService.getInstance(project)
        logger.log("[CIPE_MONITOR] Stopping polling service")
        pollingService.stopPolling()

        isInitialized = false
        logger.log("[CIPE_MONITOR] CIPE monitoring stopped successfully")
    }

    override fun dispose() {
        logger.log("[CIPE_MONITOR] Disposing CIPEMonitoringService")
        stop()
    }
}
