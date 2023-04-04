package dev.nx.console.utils

import com.intellij.execution.wsl.WslPath

fun nxlsWorkingPath(basePath: String) =
    if (WslPath.isWslUncPath(basePath)) {
        WslPath.parseWindowsUncPath(basePath)!!.linuxPath
    } else {
        basePath
    }
