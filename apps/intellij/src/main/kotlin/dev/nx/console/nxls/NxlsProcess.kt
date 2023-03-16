package dev.nx.console.nxls

import com.intellij.execution.ExecutionException
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.javascript.nodejs.interpreter.NodeCommandLineConfigurator
import com.intellij.javascript.nodejs.interpreter.NodeJsInterpreterManager
import com.intellij.javascript.nodejs.interpreter.local.NodeJsLocalInterpreter
import com.intellij.javascript.nodejs.interpreter.wsl.WslNodeInterpreter
import com.intellij.lang.javascript.service.JSLanguageServiceUtil
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.util.application
import dev.nx.console.NxConsoleBundle
import dev.nx.console.utils.nxBasePath
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream

private val logger = logger<NxlsProcess>()

class NxlsProcess(private val project: Project) {

    private val basePath = project.nxBasePath

    private var process: Process? = null

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
            }
        }
    }

    fun getInputStream(): InputStream? {
        return process?.inputStream
    }

    fun getOutputStream(): OutputStream? {
        return process?.outputStream
    }

    private fun createCommandLine(): GeneralCommandLine {
        val nodeInterpreter = NodeJsInterpreterManager.getInstance(project).interpreter
        if (nodeInterpreter !is NodeJsLocalInterpreter && nodeInterpreter !is WslNodeInterpreter) {
            throw ExecutionException(NxConsoleBundle.message("interpreter.not.configured"))
        }

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

            NodeCommandLineConfigurator.find(nodeInterpreter)
                .configure(this, NodeCommandLineConfigurator.defaultOptions(project))
        }
    }
}
