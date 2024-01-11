package dev.nx.console.settings.options

import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.dsl.builder.Panel
import dev.nx.console.settings.NxConsoleSettingBase

class ShowProjectDetailsViewSetting : NxConsoleSettingBase<Boolean> {
    private val checkbox: JBCheckBox =
        JBCheckBox().apply { text = "Show Project Details View (Beta)" }

    override fun render(panel: Panel): Unit {
        panel.apply { row { cell(checkbox) } }
    }

    override fun getValue(): Boolean {
        return checkbox.isSelected
    }

    override fun setValue(value: Boolean) {
        checkbox.isSelected = value
    }
}
