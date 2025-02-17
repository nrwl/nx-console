package dev.nx.console.nxls

import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project

suspend fun Project.nxWorkspace() = service<NxlsService>().workspace()
