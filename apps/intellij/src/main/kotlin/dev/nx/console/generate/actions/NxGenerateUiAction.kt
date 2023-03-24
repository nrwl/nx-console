package dev.nx.console.generate.actions

import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import dev.nx.console.generate.NxGenerateService
import dev.nx.console.generate.ui.DefaultNxGenerateUiFile
import dev.nx.console.models.NxGenerator
import dev.nx.console.models.NxGeneratorOption
import dev.nx.console.nxls.server.requests.NxGeneratorOptionsRequestOptions
import dev.nx.console.services.NxlsService
import kotlinx.coroutines.runBlocking

private val logger = logger<NxGenerateUiAction>()

class NxGenerateUiAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val generateService = project.service<NxGenerateService>()

        val path =
            if (ActionPlaces.isPopupPlace(e.place)) {
                e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path
            } else {
                null
            }

        runBlocking {
            generateService.selectGenerator(e) { it?.let { generateService.openGenerateUi(project, it, path) } }
        }
    }
}
