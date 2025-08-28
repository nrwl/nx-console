package dev.nx.console.utils

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.util.ExecUtil
import com.intellij.openapi.util.SystemInfo

object NxProvenance {

    fun nxLatestHasProvenance(): Boolean {
        val command =
            GeneralCommandLine().apply {
                exePath = if (SystemInfo.isWindows) "npm.cmd" else "npm"
                addParameters("view", "nx@latest", "dist.attestations.provenance", "--json")
                charset = Charsets.UTF_8
            }

        val result = ExecUtil.execAndGetOutput(command)
        return result.stdout.trim().isNotEmpty()
    }

    const val NO_PROVENANCE_ERROR =
        "An error occurred while checking the integrity of the latest version of Nx. This shouldn't happen. Please file an issue at https://github.com/nrwl/nx-console/issues"
}
