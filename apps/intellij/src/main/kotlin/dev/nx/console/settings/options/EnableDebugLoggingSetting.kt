package dev.nx.console.settings.options

import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.dsl.builder.Panel
import dev.nx.console.settings.NxConsoleSettingBase

class EnableDebugLoggingSetting : NxConsoleSettingBase<Boolean> {

    private val checkbox: JBCheckBox = JBCheckBox().apply { text = "Enable Debug Logging" }

    override fun render(panel: Panel) {
        panel.apply {
            row {
                cell(checkbox)
                    .comment(
                        "Enable verbose debug logging in Nx Console logs and the Nx Language Server."
                    )
            }
        }
    }

    override fun getValue(): Boolean = checkbox.isSelected

    override fun setValue(value: Boolean) {
        checkbox.isSelected = value
    }
}
