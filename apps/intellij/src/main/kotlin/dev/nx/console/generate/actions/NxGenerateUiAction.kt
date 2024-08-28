package dev.nx.console.generate.actions

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.util.application
import dev.nx.console.generate.NxGenerateService
import dev.nx.console.nx_toolwindow.NxToolWindowPanel
import dev.nx.console.telemetry.TelemetryEvent
import dev.nx.console.telemetry.TelemetryEventSource
import dev.nx.console.telemetry.TelemetryService
import dev.nx.console.utils.ProjectLevelCoroutineHolderService
import kotlinx.coroutines.launch

private val logger = logger<NxGenerateUiAction>()

class NxGenerateUiAction : AnAction() {
    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        super.update(e)
        if (e.place == NxToolWindowPanel.NX_TOOLBAR_PLACE) {
            e.presentation.icon = AllIcons.Actions.AddList
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        TelemetryService.getInstance(project)
            .featureUsed(
                TelemetryEvent.GENERATE_UI,
                mapOf(
                    "source" to
                        if (ActionPlaces.isPopupPlace(e.place))
                            TelemetryEventSource.EXPLORER_CONTEXT_MENU
                        else TelemetryEventSource.COMMAND
                )
            )

        val generateService = project.service<NxGenerateService>()

        val path =
            if (ActionPlaces.isPopupPlace(e.place)) {
                e.dataContext.getData(CommonDataKeys.VIRTUAL_FILE)?.path
            } else {
                null
            }

        application.runReadAction {
            ProjectLevelCoroutineHolderService.getInstance(project).cs.launch {
                val selectedGenerator = generateService.selectGenerator(e) ?: return@launch
                generateService.openGenerateUi(project, selectedGenerator, path)
            }
        }
    }
}
