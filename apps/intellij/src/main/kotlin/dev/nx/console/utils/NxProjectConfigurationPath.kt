package dev.nx.console.utils

import com.intellij.openapi.project.Project
import java.nio.file.Files
import java.nio.file.Paths

fun nxProjectConfigurationPath(project: Project, nxProjectRoot: String?): String? {
    val baseNxProjectRoot = Paths.get(project.nxBasePath, nxProjectRoot).toString()
    val projectJson = Paths.get(baseNxProjectRoot, "project.json")
    val packageJson = Paths.get(baseNxProjectRoot, "package.json")

    return if (Files.exists(projectJson)) {
        projectJson.toString()
    } else if (Files.exists(packageJson)) {
        packageJson.toString()
    } else {
        null
    }
}
