package dev.nx.console.utils

import com.intellij.execution.ExecutionException
import com.intellij.execution.wsl.WslPath
import com.intellij.javascript.nodejs.library.yarn.pnp.YarnPnpManager
import com.intellij.javascript.nodejs.npm.NpmPackageDescriptor
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.SystemInfo
import com.intellij.openapi.vfs.VfsUtilCore
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileManager
import dev.nx.console.NxConsoleBundle
import java.io.File
import java.nio.file.Paths
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

private val logger = logger<NxExecutable>()

class NxExecutable {
    companion object {
        fun getExecutablePath(basePath: String, project: Project): String {

            logger.info("Checking if there is standalone nx")
            val nxExecutableName =
                if (SystemInfo.isWindows && !WslPath.isWslUncPath(basePath)) "nx.bat" else "nx"
            val nxExecutable = File(Paths.get(basePath, nxExecutableName).toString())

            if (nxExecutable.exists() && !nxExecutable.isDirectory()) {
                return nxExecutable.absolutePath
            }

            getYarnPnpNx(basePath, project)?.let {
                return it.script
            }

            val binPath = Paths.get(basePath, "node_modules", ".bin").toString()

            if (WslPath.isWslUncPath(binPath)) {
                return WslPath.parseWindowsUncPath(
                        Paths.get(binPath, nxExecutableName).toString()
                    )!!
                    .linuxPath
            }

            logger.info("Using ${binPath} as base to find local nx binary")
            val nxPackage =
                NpmPackageDescriptor.findLocalBinaryFilePackage(binPath, "nx")
                    ?.systemIndependentPath
                    ?: throw ExecutionException(NxConsoleBundle.message("nx.not.found"))

            return nxPackage
        }

        fun getYarnPnpNx(basePath: String, project: Project): YarnPnpNx? {
            if (isDotNxInstallation(basePath)) return null
            val yarnPnpManager = YarnPnpManager.getInstance(project)
            val virtualBaseFile =
                VirtualFileManager.getInstance().findFileByNioPath(Paths.get(basePath))
                    ?: return null
            if (!yarnPnpManager.isUnderPnp(virtualBaseFile)) return null

            val packageJsonFile =
                virtualBaseFile.findChild("package.json")
                    ?: throw ExecutionException(NxConsoleBundle.message("nx.not.found"))
            val nxPackage =
                yarnPnpManager.findInstalledPackageDir(packageJsonFile, "nx")
                    ?: throw ExecutionException(NxConsoleBundle.message("nx.not.found"))
            val pnpFile =
                virtualBaseFile.findChild(".pnp.cjs")
                    ?: yarnPnpManager.pnpFiles.firstOrNull()?.pnpFile
                    ?: throw ExecutionException(NxConsoleBundle.message("nx.not.found"))
            val loaderFile = pnpFile.parent?.findChild(".pnp.loader.mjs")
            val runtimeOptions =
                listOfNotNull(
                        "--require ${quoteNodeOption(pnpFile.path)}",
                        loaderFile?.let {
                            "--experimental-loader ${quoteNodeOption(it.toNioPath().toUri().toString())}"
                        },
                    )
                    .joinToString(" ")
            return YarnPnpNx(
                Paths.get(nxPackage.path, nxBinPath(nxPackage)).normalize().toString(),
                runtimeOptions,
            )
        }

        /** The `nx` entry of the package's `bin`, which moved from bin/nx.js to dist/bin/nx.js. */
        internal fun nxBinPath(nxPackage: VirtualFile): String =
            runCatching {
                    val packageJson = nxPackage.findChild("package.json") ?: return@runCatching null
                    when (
                        val bin =
                            Json.parseToJsonElement(VfsUtilCore.loadText(packageJson))
                                .jsonObject["bin"]
                    ) {
                        is JsonPrimitive -> bin.content
                        is JsonObject -> bin["nx"]?.jsonPrimitive?.content
                        else -> null
                    }
                }
                .getOrNull() ?: "bin/nx.js"

        private fun quoteNodeOption(value: String): String =
            if (value.any { it.isWhitespace() }) "\"$value\"" else value
    }
}

/**
 * The nx bin script of a Yarn PnP workspace. Without node_modules there is no executable to start:
 * the script has to run in node with the PnP runtime preloaded, which is what `yarn node` does
 * through NODE_OPTIONS. Nx passes NODE_OPTIONS on to the processes it starts, such as the daemon
 * and plugin workers.
 */
class YarnPnpNx(val script: String, private val runtimeOptions: String) {
    fun nodeOptions(existing: String?): String =
        if (existing.isNullOrBlank()) runtimeOptions else "$runtimeOptions $existing"
}

fun isDotNxInstallation(basePath: String): Boolean {
    val nxExecutableName =
        if (SystemInfo.isWindows && !WslPath.isWslUncPath(basePath)) "nx.bat" else "nx"
    val nxExecutable = File(Paths.get(basePath, nxExecutableName).toString())
    return nxExecutable.exists() && !nxExecutable.isDirectory()
}

fun getNxPackagePath(project: Project, basePath: String): String {
    if (isDotNxInstallation(basePath)) {
        return Paths.get(basePath, ".nx", "installation", "node_modules", "nx").toString()
    }

    val yarnPnpManager = YarnPnpManager.getInstance(project)
    val virtualBaseFile = VirtualFileManager.getInstance().findFileByNioPath(Paths.get(basePath))
    if (virtualBaseFile != null && yarnPnpManager.isUnderPnp(virtualBaseFile)) {
        val packagJsonFile =
            virtualBaseFile.findChild("package.json")
                ?: throw ExecutionException(NxConsoleBundle.message("nx.not.found"))
        val nxPackage =
            yarnPnpManager.findInstalledPackageDir(packagJsonFile, "nx")
                ?: throw ExecutionException(NxConsoleBundle.message("nx.not.found"))
        return nxPackage.path
    } else {
        return Paths.get(basePath, "node_modules", "nx").toString()
    }
}
