package dev.nx.console.generate

import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.openapi.util.text.StringUtil
import com.intellij.ui.ColoredListCellRenderer
import com.intellij.ui.SimpleTextAttributes
import com.intellij.ui.scale.JBUIScale
import com.intellij.util.ui.EmptyIcon
import com.intellij.util.ui.JBScalableIcon
import com.intellij.util.ui.JBUI
import com.intellij.util.ui.UIUtil
import dev.nx.console.models.NxGenerator
import dev.nx.console.services.NxlsService
import java.awt.Dimension
import javax.swing.JList
import javax.swing.ListSelectionModel.SINGLE_SELECTION

class NxGenerateService(val project: Project) {

    suspend fun selectGenerator(
        actionEvent: AnActionEvent?,
        callback: (generator: NxGenerator?) -> Unit
    ) {
        val nxlsService = project.service<NxlsService>()

        val generators = nxlsService.generators()

        if (generators.isEmpty()) {
            callback(null)
        }
        val generatorNames = generators.map { it.name }

        if (generatorNames.size == 1) {
            val chosenGenerator = generators.find { g -> g.name == generatorNames[0] }
            callback(chosenGenerator)
        }

        val popup =
            JBPopupFactory.getInstance()
                .createPopupChooserBuilder(generators)
                .setRenderer(
                    object : ColoredListCellRenderer<NxGenerator>() {
                        override fun customizeCellRenderer(
                            list: JList<out NxGenerator>,
                            value: NxGenerator,
                            index: Int,
                            selected: Boolean,
                            hasFocus: Boolean
                        ) {
                            if (!selected && index % 2 == 0) {
                                background = UIUtil.getDecoratedRowColor()
                            }
                            icon = JBUIScale.scaleIcon(EmptyIcon.create(5) as JBScalableIcon)
                            append(
                                "${value.data.collection} - ${value.data.name}",
                                SimpleTextAttributes.REGULAR_ATTRIBUTES,
                                true
                            )
                            append(
                                " " +
                                    StringUtil.shortenTextWithEllipsis(
                                        value.data.description,
                                        80 - value.name.length,
                                        0
                                    ),
                                SimpleTextAttributes.GRAY_ATTRIBUTES,
                                false
                            )
                        }
                    }
                )
                .setTitle("Nx Generate (UI)")
                .setSelectionMode(SINGLE_SELECTION)
                .setRequestFocus(true)
                .setFilterAlwaysVisible(true)
                .setResizable(true)
                .setMovable(true)
                .setNamerForFiltering { "${it.data.collection} - ${it.data.name}" }
                .setItemChosenCallback { chosen ->
                    if (chosen != null) {
                        callback(chosen)
                    }
                }
                .setMinSize(Dimension(JBUI.scale(350), JBUI.scale(300)))
                .setDimensionServiceKey("nx.dev.console.generate")
                .createPopup()

        if (actionEvent?.dataContext != null) {
            popup.showInBestPositionFor(actionEvent.dataContext)
        } else {
            popup.showInFocusCenter()
        }
    }
}
