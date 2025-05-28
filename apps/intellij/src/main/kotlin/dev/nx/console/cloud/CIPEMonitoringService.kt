package dev.nx.console.cloud

import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import dev.nx.console.utils.sync_services.NxCloudStatusSyncAccessService
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
        if (isInitialized) {
            logger.debug("CIPE monitoring already initialized")
            return
        }

        cs.launch {
            try {
                // Check if workspace is connected to Nx Cloud
                val cloudStatus = NxCloudStatusSyncAccessService.getInstance(project).cloudStatus

                if (cloudStatus?.isConnected == true) {
                    logger.info("Nx Cloud is connected, initializing CIPE monitoring")

                    // Get services
                    val pollingService = CIPEPollingService.getInstance(project)
                    val dataSyncService = CIPEDataSyncService.getInstance(project)
                    val notificationService = CIPENotificationService.getInstance(project)

                    // Connect notification service to data sync
                    dataSyncService.addChangeListener(notificationService)

                    // Start polling
                    pollingService.startPolling()

                    isInitialized = true
                    logger.info("CIPE monitoring initialized successfully")
                } else {
                    logger.info("Nx Cloud not connected, skipping CIPE monitoring initialization")
                }
            } catch (e: Exception) {
                logger.error("Failed to initialize CIPE monitoring", e)
            }
        }
    }

    /** Stop CIPE monitoring */
    fun stop() {
        if (!isInitialized) {
            return
        }

        logger.info("Stopping CIPE monitoring")

        val pollingService = CIPEPollingService.getInstance(project)
        pollingService.stopPolling()

        isInitialized = false
    }

    override fun dispose() {
        stop()
    }
}
