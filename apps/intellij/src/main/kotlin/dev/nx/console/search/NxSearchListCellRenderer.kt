package dev.nx.console.search

import com.intellij.icons.AllIcons
import com.intellij.openapi.util.text.StringUtil
import com.intellij.ui.ColoredListCellRenderer
import com.intellij.ui.SimpleTextAttributes
import icons.ExternalSystemIcons
import javax.swing.JList

internal class NxSearchListCellRenderer : ColoredListCellRenderer<NxSearchItem>() {
    override fun customizeCellRenderer(
        list: JList<out NxSearchItem>,
        value: NxSearchItem,
        index: Int,
        selected: Boolean,
        hasFocus: Boolean,
    ) {
        when (value) {
            is NxSearchItem.Project -> {
                icon = AllIcons.Nodes.Module
                append(value.name, SimpleTextAttributes.REGULAR_ATTRIBUTES, true)
                append(" Nx project · ${value.root}", SimpleTextAttributes.GRAY_ATTRIBUTES, false)
            }
            is NxSearchItem.Target -> {
                icon = ExternalSystemIcons.Task
                append(
                    "${value.project}:${value.target}",
                    SimpleTextAttributes.REGULAR_ATTRIBUTES,
                    true,
                )
                append(" Nx target", SimpleTextAttributes.GRAY_ATTRIBUTES, false)
            }
            is NxSearchItem.Generator -> {
                val generator = value.generator
                icon = AllIcons.Actions.GeneratedFolder
                append(
                    "${generator.data.collection} - ${generator.data.name}",
                    SimpleTextAttributes.REGULAR_ATTRIBUTES,
                    true,
                )
                generator.data.description
                    ?.takeIf { generator.name.length < 80 }
                    ?.let {
                        append(
                            " " +
                                StringUtil.shortenTextWithEllipsis(
                                    it,
                                    80 - generator.name.length,
                                    0,
                                ),
                            SimpleTextAttributes.GRAY_ATTRIBUTES,
                            false,
                        )
                    }
            }
        }
    }
}
