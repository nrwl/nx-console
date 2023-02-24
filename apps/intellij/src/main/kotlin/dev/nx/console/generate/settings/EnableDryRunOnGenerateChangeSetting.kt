package dev.nx.console.generate.settings

import com.intellij.ui.components.JBCheckBox
import dev.nx.console.settings.NxConsoleSettingBase
import javax.swing.JComponent

class EnableDryRunOnGenerateChangeSetting : NxConsoleSettingBase<Boolean> {

    private val checkbox: JBCheckBox =
        JBCheckBox().apply { text = "Enable dry run on generate change" }

    override fun getComponent(): JComponent {
        return checkbox
    }

    override fun getValue(): Boolean {
        return checkbox.isSelected
    }

    override fun setValue(value: Boolean) {
        checkbox.isSelected = value
    }
}
