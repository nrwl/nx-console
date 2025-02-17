package dev.nx.console.ide

import com.intellij.execution.ConsoleFolding
import com.intellij.openapi.project.Project

internal class ConsoleFolding : ConsoleFolding() {
    override fun getPlaceholderText(project: Project, lines: MutableList<String>): String? {
        val nxCommand = lines[0].split(" ").toMutableList()
        nxCommand[0] = "nx"

        return nxCommand.joinToString(" ")
    }

    override fun shouldFoldLine(project: Project, line: String): Boolean {
        return "node_modules/.bin/nx" in line
    }
}
