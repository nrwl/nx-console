package dev.nx.console.generate_ui.run_generator

import com.intellij.javascript.nodejs.interpreter.NodeJsInterpreterManager
import com.intellij.javascript.nodejs.npm.NpmUtil
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindowManager
import io.ktor.utils.io.errors.*
import org.jetbrains.plugins.terminal.ShellTerminalWidget
import org.jetbrains.plugins.terminal.TerminalToolWindowFactory
import org.jetbrains.plugins.terminal.TerminalView

fun runGenerator(generator: String, flags: List<String>, project: Project): Unit {
    val args: List<String> = listOf("nx", "g", generator, *flags.toTypedArray())

    val terminalView: TerminalView = TerminalView.getInstance(project)

    val npmPackageRef = NpmUtil.createProjectPackageManagerPackageRef()
    val npmPkgManager =
        NpmUtil.resolveRef(
            npmPackageRef,
            project,
            NodeJsInterpreterManager.getInstance(project).interpreter
        )
    val pkgManagerExecCommand: String =
        if (npmPkgManager != null && NpmUtil.isYarnAlikePackage(npmPkgManager)) {
            "yarn exec"
        } else if (npmPkgManager != null && NpmUtil.isPnpmPackage(npmPkgManager)) {
            "pnpm exec"
        } else {
            "npx"
        }

    try {
        ApplicationManager.getApplication()
            .invokeLater(
                {
                    val window =
                        ToolWindowManager.getInstance(project)
                            .getToolWindow(TerminalToolWindowFactory.TOOL_WINDOW_ID)
                    val contentManager = window?.contentManager

                    val tabName = "Nx Generate"

                    val widget =
                        when (val content = contentManager?.findContent(tabName)) {
                            null ->
                                terminalView.createLocalShellWidget(project.basePath, "Nx Generate")
                            else -> TerminalView.getWidgetByContent(content) as ShellTerminalWidget
                        }

                    widget.executeCommand("$pkgManagerExecCommand ${args.joinToString(" ")}")
                },
                ModalityState.defaultModalityState()
            )
    } catch (e: Exception) {
        logger<String>().warn("Cannot execute command", e)
    }
}
