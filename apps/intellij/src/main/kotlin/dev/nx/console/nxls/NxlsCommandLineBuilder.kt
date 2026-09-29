package dev.nx.console.nxls

import com.intellij.execution.ExecutionException
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.javascript.nodejs.interpreter.NodeCommandLineConfigurator
import com.intellij.javascript.nodejs.interpreter.NodeJsInterpreter
import com.intellij.javascript.nodejs.library.yarn.pnp.YarnPnpManager
import com.intellij.lang.javascript.service.JSLanguageServiceUtil
import com.intellij.openapi.application.readAction
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFileManager
import dev.nx.console.NxConsoleBundle
import dev.nx.console.utils.NxConsoleLogger
import dev.nx.console.utils.isDevelopmentInstance
import dev.nx.console.utils.nodeInterpreter
import dev.nx.console.utils.nxBasePath
import java.io.File
import java.nio.file.Paths

class NxlsCommandLineBuilder(private val workspace: NxlsWorkspaceSnapshot) {
    fun build(): GeneralCommandLine =
        GeneralCommandLine().apply {
            withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE)
            val pnpArg = workspace.pnpFilePath?.let { "--require $it" } ?: ""
            withEnvironment(
                "NODE_OPTIONS",
                if (workspace.isDevelopment) "--inspect=6009 --enable-source-maps $pnpArg"
                else pnpArg,
            )
            withCharset(Charsets.UTF_8)
            workDirectory = File(workspace.basePath)
            addParameter(workspace.serverPath)
            addParameter("--stdio")
            NodeCommandLineConfigurator.find(workspace.nodeInterpreter).configure(this)
        }
}

data class NxlsWorkspaceSnapshot(
    val basePath: String,
    val serverPath: String,
    val nodeInterpreter: NodeJsInterpreter,
    val pnpFilePath: String?,
    val isDevelopment: Boolean,
) {
    companion object {
        suspend fun capture(project: Project, basePath: String): NxlsWorkspaceSnapshot {
            val lsp =
                JSLanguageServiceUtil.getPluginDirectory(
                    NxlsCommandLineBuilder::class.java,
                    "nxls/main.js",
                )
            if (lsp == null || !lsp.exists()) {
                throw ExecutionException(NxConsoleBundle.message("language.server.not.found"))
            }
            NxConsoleLogger.getInstance().log("nxls found via ${lsp.path}")
            val pnpFilePath = readAction {
                val yarnPnpManager = YarnPnpManager.getInstance(project)
                val virtualBaseFile =
                    VirtualFileManager.getInstance()
                        .findFileByNioPath(Paths.get(project.nxBasePath))
                if (virtualBaseFile != null && yarnPnpManager.isUnderPnp(virtualBaseFile)) {
                    yarnPnpManager.pnpFiles.first().pnpFile.path
                } else {
                    null
                }
            }
            return NxlsWorkspaceSnapshot(
                basePath,
                lsp.path,
                project.nodeInterpreter,
                pnpFilePath,
                isDevelopmentInstance(),
            )
        }
    }
}
