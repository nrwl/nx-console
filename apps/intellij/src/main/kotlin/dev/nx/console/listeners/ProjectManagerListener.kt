package dev.nx.console.listeners

import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.ProjectManagerListener
import dev.nx.console.nxls.NxlsService

internal class ProjectManagerListener : ProjectManagerListener {

    override fun projectClosed(project: Project) {
        project.service<NxlsService>().close()
    }
}
