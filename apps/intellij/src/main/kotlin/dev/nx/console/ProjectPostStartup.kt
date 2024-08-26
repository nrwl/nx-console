package dev.nx.console

import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity
import dev.nx.console.ide.ProjectGraphErrorProblemProvider
import dev.nx.console.nxls.NxlsService
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.telemetry.ExtensionLevelErrorTelemetry
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.nxBasePath
import dev.nx.console.utils.sync_services.NxProjectJsonToProjectMap
import java.io.File

internal class ProjectPostStartup : ProjectActivity {
    override suspend fun execute(project: Project) {

        var currentDir = File(project.nxBasePath)
        val filesToScanFor = listOf("nx.json", "workspace.json", "lerna.json")

        while (true) {
            if (filesToScanFor.any { currentDir.resolve(it).exists() }) {
                val service = NxlsService.getInstance(project)
                service.start()
                service.runAfterStarted {
                    NxProjectJsonToProjectMap.getInstance(project).init()
                    ProjectGraphErrorProblemProvider.getInstance(project).init()
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

        TelemetryService.getInstance(project)
            .featureUsed(TelemetryEvent.EXTENSION_ACTIVATE, mapOf("timing" to 0))

        ExtensionLevelErrorTelemetry.getInstance(project).listen()
    }
}
