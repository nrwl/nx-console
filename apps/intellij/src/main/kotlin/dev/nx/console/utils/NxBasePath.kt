package dev.nx.console.utils

import com.intellij.openapi.project.Project
import dev.nx.console.settings.NxConsoleProjectSettingsProvider
import java.nio.file.Paths

/**
 * Get the base path of the current Nx project. Will get the settings first, then default to the
 * `basePath`
 */
val Project.nxBasePath: String
    get() =
        basePath?.let {
            val settingsPath = NxConsoleProjectSettingsProvider.getInstance(this).workspacePath
            if (settingsPath == null) {
                null
            } else {
                Paths.get(it).resolve(settingsPath).toString()
            }
        }
            ?: basePath ?: throw IllegalStateException("Base path is not found for project")
