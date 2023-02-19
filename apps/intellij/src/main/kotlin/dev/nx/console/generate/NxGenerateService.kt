package dev.nx.console.generate

import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import dev.nx.console.nxls.server.NxGenerator
import dev.nx.console.services.NxlsService
import javax.swing.ListSelectionModel

class NxGenerateService(val project: Project) {

    suspend fun selectGenerator(
        actionEvent: AnActionEvent,
        callback: (generator: NxGenerator?) -> Unit
    ) {
        selectGenerator(actionEvent, null, callback)
    }
    suspend fun selectGenerator(
        generatorFilter: Regex,
        callback: (generator: NxGenerator?) -> Unit
    ) {
        selectGenerator(null, generatorFilter, callback)
    }
    suspend fun selectGenerator(
        actionEvent: AnActionEvent?,
        generatorFilter: Regex?,
        callback: (generator: NxGenerator?) -> Unit
    ) {
        val nxlsService = project.service<NxlsService>()

        val generators = nxlsService.generators()
        val generatorNames = generators.map { it.name }

        val generatorNamesFiltered =
            when (generatorFilter) {
                null -> generatorNames
                else -> generatorNames.filter { it.contains(generatorFilter) }
            }

        if (generatorNamesFiltered.size === 0) {
            callback(null)
        }

        if (generatorNamesFiltered.size == 1) {
            val chosenGenerator = generators.find { g -> g.name == generatorNamesFiltered[0] }
            callback(chosenGenerator)
        }

        val popup =
            JBPopupFactory.getInstance()
                .createPopupChooserBuilder(generatorNamesFiltered)
                .setTitle("Nx Generate (UI)")
                .setSelectionMode(ListSelectionModel.SINGLE_SELECTION)
                .setRequestFocus(true)
                .setFilterAlwaysVisible(true)
                .setResizable(true)
                .setMovable(true)
                .setNamerForFiltering { it }
                .setItemChosenCallback { chosen ->
                    val chosenGenerator = generators.find { g -> g.name == chosen }
                    callback(chosenGenerator)
                }
                .createPopup()

        if (actionEvent?.dataContext != null) {
            popup.showInBestPositionFor(actionEvent.dataContext)
        } else {
            popup.showInFocusCenter()
        }
    }
}
