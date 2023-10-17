package dev.nx.console.utils

import com.intellij.execution.wsl.WslPath
import com.intellij.openapi.util.SystemInfo

fun nxlsWorkingPath(basePath: String) =
    if (WslPath.isWslUncPath(basePath)) {
        WslPath.parseWindowsUncPath(basePath)!!.linuxPath
    } else if (SystemInfo.isWindows) {
        basePath.replace("/", "\\")
    } else {
        basePath
    }
