package dev.nx.console.nxls

import com.intellij.execution.ExecutionException
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.javascript.nodejs.interpreter.NodeCommandLineConfigurator
import com.intellij.lang.javascript.service.JSLanguageServiceUtil
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.util.application
import com.intellij.util.io.awaitExit
import dev.nx.console.NxConsoleBundle
import dev.nx.console.utils.nodeInterpreter
import dev.nx.console.utils.nxBasePath
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

private val logger = logger<NxlsProcess>()

class NxlsProcess(private val project: Project, private val cs: CoroutineScope) {

    private val basePath = project.nxBasePath

    private var process: Process? = null

    private var onExit: (() -> Unit)? = null

    private var exitJob: Job? = null

    fun start() {
        logger.info("Staring the nxls process in workingDir $basePath")
        createCommandLine().apply {
            process = createProcess()
            process?.let {
                if (!it.isAlive) {
                    throw IOException("Unable to start nxls")
                } else {
                    logger.info("nxls started: $it")
                }
                exitJob =
                    cs.launch {
                        it.awaitExit()
                        it.errorStream.readAllBytes().decodeToString().run {
                            if (this.isEmpty()) {
                                return@run
                            }

                            if (project.isDisposed) {
                                return@run
                            }

                            logger.trace("Nxls early exit: $this")
                            onExit?.invoke()
                        }
                    }
            }
        }
    }

    suspend fun stop() {
        exitJob?.cancel()
        thisLogger().info("stopping nxls process")
        val hasExited =
            if (process?.isAlive == false) {
                thisLogger().info("process is not alive")
                true
            } else {
                withTimeoutOrNull(1000L) {
                    thisLogger().info("waiting for process to exit")
                    process?.awaitExit()
                    true
                }
                    ?: false
            }
        thisLogger().info("Process exited: $hasExited")

        if (!hasExited) {
            thisLogger().info("Process did not exit in time, destroying forcibly.")
            process?.destroyForcibly()
        }
    }

    fun getInputStream(): InputStream? {
        return process?.inputStream
    }

    fun getOutputStream(): OutputStream? {
        return process?.outputStream
    }

    fun isAlive(): Boolean? {
        return process?.isAlive()
    }

    fun callOnExit(callback: () -> Unit) {
        this.onExit = callback
    }

    private fun createCommandLine(): GeneralCommandLine {
        val lsp =
            JSLanguageServiceUtil.getPluginDirectory(this@NxlsProcess.javaClass, "nxls/main.js")
        if (lsp == null || !lsp.exists()) {
            throw ExecutionException(NxConsoleBundle.message("language.server.not.found"))
        }

        logger.info("nxls found via ${lsp.path}")
        return GeneralCommandLine().apply {
            withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE)
            if (application.isInternal) {
                withEnvironment("NODE_OPTIONS", "--inspect=6009 --enable-source-maps")
            }
            withCharset(Charsets.UTF_8)
            workDirectory = File(basePath)
            addParameter(lsp.path)
            addParameter("--stdio")

            NodeCommandLineConfigurator.find(project.nodeInterpreter).configure(this)
        }
    }
}
