package dev.nx.console.utils

import com.intellij.execution.ExecutionException
import com.intellij.execution.wsl.WslPath
import com.intellij.javascript.nodejs.npm.NpmPackageDescriptor
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.util.SystemInfo
import dev.nx.console.NxConsoleBundle
import java.io.File
import java.nio.file.Paths

val logger = logger<NxExecutable>()

class NxExecutable {
    companion object {
        fun getExecutablePath(basePath: String): String {

            logger.info("Checking if there is standalone nx")
            val nxExecutableName =
                if (SystemInfo.isWindows && !WslPath.isWslUncPath(basePath)) "nx.bat" else "nx"
            val nxExecutable = File(Paths.get(basePath, nxExecutableName).toString())

            if (nxExecutable.exists()) {
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
