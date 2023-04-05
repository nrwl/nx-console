package dev.nx.console.nxls

import com.intellij.execution.ExecutionException
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.javascript.nodejs.interpreter.NodeCommandLineConfigurator
import com.intellij.lang.javascript.service.JSLanguageServiceUtil
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.util.application
import dev.nx.console.NxConsoleBundle
import dev.nx.console.ui.Notifier
import dev.nx.console.utils.nodeInterpreter
import dev.nx.console.utils.nxBasePath
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch

private val logger = logger<NxlsProcess>()

class NxlsProcess(private val project: Project) {

    private val basePath = project.nxBasePath

    private var process: Process? = null

    private var onExit: (() -> Unit)? = null

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
                CoroutineScope(Dispatchers.Default).launch {
                    val e = it.onExit().await()
                    e.errorStream.readAllBytes().decodeToString().run {
                        if (this.isEmpty()) {
                            return@run
                        }

                        logger.trace("Error: $this")

                        Notifier.notifyNxlsError(project)
                        onExit?.invoke()
                    }
                }
            }
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
        val lsp = JSLanguageServiceUtil.getPluginDirectory(javaClass, "nxls/main.js")
        //        val nxlsPath = PathEnvironmentVariableUtil.findInPath("nxls")
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

            NodeCommandLineConfigurator.find(project.nodeInterpreter)
                .configure(this, NodeCommandLineConfigurator.defaultOptions(project))
        }
    }
}
