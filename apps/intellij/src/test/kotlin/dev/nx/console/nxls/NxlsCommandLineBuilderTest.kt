package dev.nx.console.nxls

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.javascript.nodejs.interpreter.local.NodeJsLocalInterpreter
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import java.io.File
import java.nio.file.Files
import kotlin.test.assertEquals as assertEqual

class NxlsCommandLineBuilderTest : BasePlatformTestCase() {
    private lateinit var workspace: NxlsWorkspaceSnapshot
    private lateinit var interpreterPath: String

    override fun setUp() {
        super.setUp()
        interpreterPath = Files.createTempFile("nxls-node-", ".exe").toString()
        check(File(interpreterPath).setExecutable(true))
        workspace =
            NxlsWorkspaceSnapshot(
                basePath = "/workspace/my-app",
                serverPath = "/plugins/nx-console/nxls/main.js",
                nodeInterpreter = NodeJsLocalInterpreter(interpreterPath),
                pnpFilePath = null,
                isDevelopment = false,
            )
    }

    override fun tearDown() {
        try {
            if (::interpreterPath.isInitialized) File(interpreterPath).delete()
        } finally {
            super.tearDown()
        }
    }

    fun testPlainWorkspaceCommandLine() {
        val commandLine = NxlsCommandLineBuilder(workspace).build()
        assertEqual(interpreterPath, commandLine.exePath)
        assertEqual(
            listOf("/plugins/nx-console/nxls/main.js", "--stdio"),
            commandLine.parametersList.list,
        )
        assertEqual(File("/workspace/my-app"), commandLine.workDirectory)
        assertEqual(
            GeneralCommandLine.ParentEnvironmentType.CONSOLE,
            commandLine.parentEnvironmentType,
        )
        assertEqual(Charsets.UTF_8, commandLine.charset)
        assertEqual("", commandLine.environment["NODE_OPTIONS"])
    }

    fun testYarnPnpAndDevelopmentOptions() {
        val pnpWorkspace = workspace.copy(pnpFilePath = "/workspace/my-app/.pnp.cjs")
        assertEqual(
            "--require /workspace/my-app/.pnp.cjs",
            NxlsCommandLineBuilder(pnpWorkspace).build().environment["NODE_OPTIONS"],
        )
        assertEqual(
            "--inspect=6009 --enable-source-maps --require /workspace/my-app/.pnp.cjs",
            NxlsCommandLineBuilder(pnpWorkspace.copy(isDevelopment = true))
                .build()
                .environment["NODE_OPTIONS"],
        )
        assertEqual(
            "--inspect=6009 --enable-source-maps ",
            NxlsCommandLineBuilder(workspace.copy(isDevelopment = true))
                .build()
                .environment["NODE_OPTIONS"],
        )
    }
}
