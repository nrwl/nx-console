package dev.nx.console.settings.options

import com.intellij.openapi.project.Project
import com.intellij.ui.ToolbarDecorator
import com.intellij.ui.dsl.builder.*
import com.intellij.ui.table.TableView
import com.intellij.util.ui.ColumnInfo
import com.intellij.util.ui.ListTableModel
import com.intellij.util.ui.table.TableModelEditor.EditableColumnInfo
import dev.nx.console.settings.NxConsoleSettingBase
import javax.swing.JTable

class GeneratorFiltersSetting(val project: Project) : NxConsoleSettingBase<List<GeneratorFilter>?> {

    private val listModel: ListTableModel<GeneratorListItem>
    private val table: TableView<GeneratorListItem>

    init {

        listModel = ListTableModel(*getColumnInfoArray())

        table =
            TableView(listModel).apply {
                tableHeader.reorderingAllowed = false
                rowSelectionAllowed = false
                setExpandableItemsEnabled(false)
            }
    }
    override fun render(panel: Panel) {
        panel.apply {
            row("Generator Filters") {
                    cell(
                            ToolbarDecorator.createDecorator(table)
                                .setAddAction { addData() }
                                .setRemoveAction { removeData() }
                                .disableUpDownActions()
                                .createPanel()
                        )
                        .align(Align.FILL)
                        .component
                }
                .layout(RowLayout.PARENT_GRID)
        }
    }

    private fun addData() {
        listModel.addRow(GeneratorListItem())
    }

    private fun removeData() {
        listModel.removeRow(table.selectedRow)
    }

    override fun getValue(): List<GeneratorFilter>? =
        listModel.items.map { GeneratorFilter(it.matcher, it.include) }

    override fun setValue(value: List<GeneratorFilter>?) {
        if (value == null) return
        listModel.items = value.map { GeneratorListItem(it.matcher, it.include, it.include.not()) }
    }

    private fun getColumnInfoArray(): Array<ColumnInfo<*, *>> {
        val generatorMatcherColumnInfo =
            object : EditableColumnInfo<GeneratorListItem, String>("Generator Pattern") {
                override fun valueOf(item: GeneratorListItem?): String? {
                    return item?.matcher
                }
                override fun setValue(item: GeneratorListItem, value: String) {
                    item.matcher = value
                }
            }
        val generatorAllowColumnInfo =
            object : EditableColumnInfo<GeneratorListItem, Boolean>("Include") {
                override fun getWidth(table: JTable?): Int {
                    return 65
                }
                override fun getColumnClass(): Class<*> {
                    return Boolean::class.java
                }
                override fun valueOf(item: GeneratorListItem?): Boolean? {
                    return item?.include
                }

                override fun setValue(item: GeneratorListItem, value: Boolean) {
                    item.include = value
                    item.exclude = value.not()
                }
            }
        val generatorDisallowColumnInfo =
            object : EditableColumnInfo<GeneratorListItem, Boolean>("Exclude") {
                override fun getWidth(table: JTable?): Int {
                    return 65
                }
                override fun getColumnClass(): Class<*> {
                    return Boolean::class.java
                }
                override fun valueOf(item: GeneratorListItem?): Boolean? {
                    return item?.exclude
                }

                override fun setValue(item: GeneratorListItem, value: Boolean) {
                    item.exclude = value
                    item.include = value.not()
                }
            }

        return arrayOf(
            generatorAllowColumnInfo,
            generatorDisallowColumnInfo,
            generatorMatcherColumnInfo
        )
    }
}

private class GeneratorListItem(
    var matcher: String = "@nx/example",
    var include: Boolean = false,
    var exclude: Boolean = true
) {}

data class GeneratorFilter(val matcher: String, val include: Boolean)
