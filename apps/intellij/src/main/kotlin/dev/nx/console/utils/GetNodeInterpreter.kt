package dev.nx.console.utils

import com.intellij.execution.ExecutionException
import com.intellij.javascript.nodejs.interpreter.NodeJsInterpreter
import com.intellij.javascript.nodejs.interpreter.NodeJsInterpreterManager
import com.intellij.javascript.nodejs.interpreter.local.NodeJsLocalInterpreter
import com.intellij.javascript.nodejs.interpreter.wsl.WslNodeInterpreter
import com.intellij.openapi.project.Project
import dev.nx.console.NxConsoleBundle

val Project.nodeInterpreter: NodeJsInterpreter
    get() =
        NodeJsInterpreterManager.getInstance(this).interpreter?.also {
            if (it !is NodeJsLocalInterpreter && it !is WslNodeInterpreter) {
                throw ExecutionException(NxConsoleBundle.message("interpreter.not.configured"))
            }
        }
            ?: throw IllegalStateException(NxConsoleBundle.message("interpreter.not.configured"))
