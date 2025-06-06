package dev.nx.console

import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.openapi.project.DumbService
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity
import dev.nx.console.cloud.CIPEMonitoringService
import dev.nx.console.ide.ProjectGraphErrorProblemProvider
import dev.nx.console.mcp.McpServerService
import dev.nx.console.nxls.NxlsService
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import dev.nx.console.utils.nxBasePath
import dev.nx.console.utils.sync_services.NxProjectJsonToProjectMap
import dev.nx.console.utils.sync_services.NxVersionUtil
import java.io.File
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

internal class ProjectPostStartup : ProjectActivity {
    override suspend fun execute(project: Project) {

        var currentDir = File(project.nxBasePath)
        val filesToScanFor = listOf("nx.json", "workspace.json", "lerna.json")

        while (true) {
            if (filesToScanFor.any { currentDir.resolve(it).exists() }) {
                ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
                    val service = NxlsService.getInstance(project)

                    service.start()
                    service.runAfterStarted {
                        NxProjectJsonToProjectMap.getInstance(project).init()
                        ProjectGraphErrorProblemProvider.getInstance(project).init()
                        NxVersionUtil.getInstance(project).listen()
                        CIPEMonitoringService.getInstance(project).init()
                    }
                }
                break
            }
            if (currentDir.parentFile == null) {
                break
            }
            currentDir = currentDir.parentFile
        }

        if (!NxConsoleSettingsProvider.getInstance().promptedForTelemetry) {
            Notifier.notifyTelemetry(project)
        }

        ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
            val aiAssistantPlugin =
                PluginManagerCore.plugins.find { it.pluginId.idString == "com.intellij.ml.llm" }
            if (aiAssistantPlugin != null) {
                // Wait for indexing to complete
                DumbService.getInstance(project).waitForSmartMode()

                delay(5000)

                val mcpService = McpServerService.getInstance(project)
                if (!mcpService.isMcpServerSetup()) {
                    Notifier.notifyMcpServerInstall(project)
                }
            }
        }

        TelemetryService.getInstance(project)
            .featureUsed(TelemetryEvent.EXTENSION_ACTIVATE, mapOf("timing" to 0))
    }
}
