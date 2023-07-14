package dev.nx.console

import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectPostStartupActivity
import dev.nx.console.services.NxlsService
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.ui.Notifier
import dev.nx.console.utils.NxProjectJsonToProjectMap

private val logger = logger<ProjectPostStartup>()

class ProjectPostStartup : ProjectPostStartupActivity {
    override suspend fun execute(project: Project) {

        val service = NxlsService.getInstance(project)
        service.start()

        if (!NxConsoleSettingsProvider.getInstance().promptedForTelemetry) {
            Notifier.notifyTelemetry(project)
        }

        TelemetryService.getInstance(project).extensionActivated(0)

        service.runAfterStarted { NxProjectJsonToProjectMap.getInstance(project).init() }
    }
}
