package dev.nx.console.settings.options

import com.intellij.openapi.project.Project
import com.intellij.ui.dsl.builder.Panel
import com.intellij.ui.table.JBTable
import dev.nx.console.settings.NxConsoleSettingBase

class GeneratorAllowlistSetting(val project: Project) : NxConsoleSettingBase<String?> {

    private val inputTable: JBTable = JBTable()
    override fun render(panel: Panel) {
        panel.apply { row { cell(inputTable) } }
    }

    override fun getValue(): String? = inputTable.getValueAt(0, 0)

    override fun setValue(value: String?) {
        if (value == null) return
        this.inputField.text = value
    }
}
