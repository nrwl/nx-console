package dev.nx.console.generate.ui

import com.intellij.openapi.util.text.StringUtil
import com.intellij.ui.ColoredListCellRenderer
import com.intellij.ui.SimpleTextAttributes
import com.intellij.ui.scale.JBUIScale
import com.intellij.util.ui.EmptyIcon
import com.intellij.util.ui.JBScalableIcon
import com.intellij.util.ui.UIUtil
import dev.nx.console.models.NxGenerator
import javax.swing.Icon
import javax.swing.JList

class NxGeneratorListCellRenderer(
    private val myIcon: Icon = JBUIScale.scaleIcon(EmptyIcon.create(5) as JBScalableIcon),
    private val alternatingRowColors: Boolean = true,
) : ColoredListCellRenderer<NxGenerator>() {
    override fun customizeCellRenderer(
        list: JList<out NxGenerator>,
        value: NxGenerator,
        index: Int,
        selected: Boolean,
        hasFocus: Boolean
    ) {
        if (alternatingRowColors) {
            if (!selected && index % 2 == 0) {
                background = UIUtil.getDecoratedRowColor()
            }
        }
        icon = myIcon
        append(
            "${value.data.collection} - ${value.data.name}",
            SimpleTextAttributes.REGULAR_ATTRIBUTES,
            true
        )

        value.data.description
            ?.takeIf { value.name.length < 80 }
            ?.let { description ->
                append(
                    " " +
                        StringUtil.shortenTextWithEllipsis(description, 80 - value.name.length, 0),
                    SimpleTextAttributes.GRAY_ATTRIBUTES,
                    false
                )
            }
    }
}
