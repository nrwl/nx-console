package dev.nx.console

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity
import dev.nx.console.nxls.NxlsService
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.NxProjectJsonToProjectMap
import dev.nx.console.utils.nxBasePath
import java.io.File

private val logger = logger<ProjectPostStartup>()

class ProjectPostStartup : ProjectActivity {
    override suspend fun execute(project: Project) {

        var currentDir = File(project.nxBasePath)
        val filesToScanFor = listOf("nx.json", "workspace.json", "angular.json", "lerna.json")

        while (true) {
            if (filesToScanFor.any { currentDir.resolve(it).exists() }) {
                val service = NxlsService.getInstance(project)
                service.start()
                service.runAfterStarted { NxProjectJsonToProjectMap.getInstance(project).init() }
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

        TelemetryService.getInstance(project).extensionActivated(0)
    }
}
