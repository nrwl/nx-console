package dev.nx.console.utils

import com.intellij.execution.ExecutionException
import com.intellij.execution.wsl.WslPath
import com.intellij.javascript.nodejs.library.yarn.pnp.YarnPnpManager
import com.intellij.javascript.nodejs.npm.NpmPackageDescriptor
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.SystemInfo
import com.intellij.openapi.vfs.VirtualFileManager
import dev.nx.console.NxConsoleBundle
import java.io.File
import java.nio.file.Paths

private val logger = logger<NxExecutable>()

class NxExecutable {
    companion object {
        /**
         * The executable that starts nx, followed by any arguments that precede nx's own. A Yarn
         * PnP workspace has no nx executable on disk, so yarn starts nx and sets up the PnP
         * runtime. `--top-level` resolves the root's nx from a nested workspace and
         * `--binaries-only` skips a root `nx` script; the working directory is kept.
         */
        fun getNxCommand(basePath: String, project: Project): List<String> =
            if (isYarnPnp(basePath, project)) {
                val yarn =
                    if (SystemInfo.isWindows && !WslPath.isWslUncPath(basePath)) "yarn.cmd"
                    else "yarn"
                listOf(yarn, "run", "--top-level", "--binaries-only", "nx")
            } else {
                listOf(getExecutablePath(basePath, project))
            }

        private fun isYarnPnp(basePath: String, project: Project): Boolean {
            if (isDotNxInstallation(basePath)) return false
            val virtualBaseFile =
                VirtualFileManager.getInstance().findFileByNioPath(Paths.get(basePath))
                    ?: return false
            return YarnPnpManager.getInstance(project).isUnderPnp(virtualBaseFile)
        }

        fun getExecutablePath(basePath: String, project: Project): String {

            logger.info("Checking if there is standalone nx")
            val nxExecutableName =
                if (SystemInfo.isWindows && !WslPath.isWslUncPath(basePath)) "nx.bat" else "nx"
            val nxExecutable = File(Paths.get(basePath, nxExecutableName).toString())

            if (nxExecutable.exists() && !nxExecutable.isDirectory()) {
                return nxExecutable.absolutePath
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
    }
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
