package dev.nx.console.utils

import com.intellij.openapi.application.PathManager

fun isDevelopmentInstance(): Boolean {
    val configPath = PathManager.getConfigPath()

    return configPath.contains("idea-sandbox")
}
