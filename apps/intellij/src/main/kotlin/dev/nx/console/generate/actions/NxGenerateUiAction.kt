package dev.nx.console.generate.actions

import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.util.application
import dev.nx.console.generate.NxGenerateService
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.ActionCoroutineHolderService
import kotlinx.coroutines.launch

private val logger = logger<NxGenerateUiAction>()

class NxGenerateUiAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project).featureUsed("Nx Generate UI")

        val generateService = project.service<NxGenerateService>()

        val path =
            if (ActionPlaces.isPopupPlace(e.place)) {
                e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path
            } else {
                null
            }

        application.runReadAction {
            ActionCoroutineHolderService.getInstance(project).cs.launch {
                val selectedGenerator = generateService.selectGenerator(e) ?: return@launch
                generateService.openGenerateUi(project, selectedGenerator, path)
            }
        }
    }
}
