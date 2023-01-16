package dev.nx.console

import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectPostStartupActivity
import dev.nx.console.services.NxlsService

class ProjectPostStartup : ProjectPostStartupActivity {
  override suspend fun execute(project: Project) {
    val service = project.service<NxlsService>()

    service.start()
  }
}
