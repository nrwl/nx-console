package dev.nx.console.generate

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

class NxMoveProjectAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val generateService = project.service<NxGenerateService>()

        runBlocking { launch { generateService.selectGenerator(Regex(":move$")) { println(it) } } }
    }
}
