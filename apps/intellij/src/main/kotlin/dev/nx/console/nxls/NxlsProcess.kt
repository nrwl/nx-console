package dev.nx.console.nxls

import com.intellij.openapi.diagnostic.logger
import com.intellij.util.EnvironmentUtil
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream

private val logger = logger<NxlsProcess>()

class NxlsProcess(private val workingDir: String) {
    // todo(cammisuli): Make sure this is platform agnostic
    val processBuilder: ProcessBuilder =
        ProcessBuilder("/bin/bash", "-c", "nxls --stdio").apply {
            val processEnv = environment()
            val env = EnvironmentUtil.getEnvironmentMap()
            processEnv["PATH"] = env["PATH"]
            logger.info("PROCESS ENV: $processEnv")

            directory(File(workingDir))
            redirectError(ProcessBuilder.Redirect.INHERIT)
        }

    var process: Process? = null

    fun start() {
        logger.info("Staring the nxls process in workingDir $workingDir")
        process = processBuilder.start()

        process?.let {
            if (!it.isAlive()) {
                throw IOException("Unable to start nxls")
            } else {
                logger.info("nxls started: $it")
            }
        }
    }

    fun getInputStream(): InputStream? {
        return process?.inputStream
    }

    fun getOutputStream(): OutputStream? {
        return process?.outputStream
    }
}
