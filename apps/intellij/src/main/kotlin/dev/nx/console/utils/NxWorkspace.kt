package dev.nx.console.utils

import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import dev.nx.console.services.NxlsService
import kotlinx.coroutines.runBlocking

fun Project.nxWorkspace() = runBlocking { service<NxlsService>().workspace() }
