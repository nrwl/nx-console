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
        fun getExecutablePath(basePath: String, project: Project): String {

            logger.info("Checking if there is standalone nx")
            val nxExecutableName =
                if (SystemInfo.isWindows && !WslPath.isWslUncPath(basePath)) "nx.bat" else "nx"
            val nxExecutable = File(Paths.get(basePath, nxExecutableName).toString())

            if (nxExecutable.exists() && !nxExecutable.isDirectory()) {
                return nxExecutable.absolutePath
            }

            val yarnPnpManager = YarnPnpManager.getInstance(project)
            val virtualBaseFile =
                VirtualFileManager.getInstance().findFileByNioPath(Paths.get(basePath))
            if (virtualBaseFile != null && yarnPnpManager.isUnderPnp(virtualBaseFile)) {
                val packagJsonFile =
                    virtualBaseFile.findChild("package.json")
                        ?: throw ExecutionException(NxConsoleBundle.message("nx.not.found"))
                val nxPackage =
                    yarnPnpManager.findInstalledPackageDir(packagJsonFile, "nx")
                        ?: throw ExecutionException(NxConsoleBundle.message("nx.not.found"))
                return Paths.get(nxPackage.path, "bin", "nx.js").toString()
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
