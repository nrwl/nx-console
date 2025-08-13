package dev.nx.console.utils

import com.google.gson.JsonParser
import com.intellij.openapi.diagnostic.logger
import java.io.File
import java.nio.file.Files
import java.nio.file.Path

private val logger = logger<CorepackDetection>()

class CorepackDetection {
    companion object {
        /**
         * Detects if Corepack is being used by checking the packageManager field in package.json
         * @param workspacePath The workspace path
         * @return The packageManager string (e.g., "yarn@4.7.0") or null if not using Corepack
         */
        fun detectCorepackPackageManager(workspacePath: String): String? {
            try {
                val packageJsonPath = Path.of(workspacePath, "package.json")
                if (!Files.exists(packageJsonPath)) {
                    return null
                }
                
                val packageJsonContent = Files.readString(packageJsonPath)
                val jsonElement = JsonParser.parseString(packageJsonContent)
                
                if (jsonElement.isJsonObject) {
                    val jsonObject = jsonElement.asJsonObject
                    if (jsonObject.has("packageManager")) {
                        val packageManager = jsonObject.get("packageManager").asString
                        logger.info("Detected Corepack package manager: $packageManager")
                        return packageManager
                    }
                }
                
                return null
            } catch (e: Exception) {
                logger.warn("Error detecting Corepack package manager", e)
                return null
            }
        }
        
        /**
         * Checks if Corepack should be used for the given workspace
         * @param workspacePath The workspace path
         * @return true if Corepack should be used
         */
        fun shouldUseCorepack(workspacePath: String): Boolean {
            return detectCorepackPackageManager(workspacePath) != null
        }
        
        /**
         * Extracts the package manager name from a Corepack packageManager string
         * @param packageManagerString The packageManager string (e.g., "yarn@4.7.0")
         * @return The package manager name (e.g., "yarn")
         */
        fun extractPackageManagerName(packageManagerString: String): String {
            val atIndex = packageManagerString.indexOf('@')
            return if (atIndex > 0) {
                packageManagerString.substring(0, atIndex)
            } else {
                packageManagerString
            }
        }
    }
}