package dev.nx.console

import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectPostStartupActivity
import dev.nx.console.services.NxlsService
import dev.nx.console.settings.NxConsoleProjectSettingsProvider

private val logger = logger<ProjectPostStartup>()

class ProjectPostStartup : ProjectPostStartupActivity {
    override suspend fun execute(project: Project) {
        val service = project.service<NxlsService>()

        service.start()

        val workspace = service.workspace()

        NxConsoleProjectSettingsProvider.getInstance(project).workspacePath?.apply {
            service.changeWorkspace(this)
        }
    }
}
