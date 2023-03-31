package dev.nx.console.settings.options

import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.dsl.builder.MAX_LINE_LENGTH_WORD_WRAP
import com.intellij.ui.dsl.builder.Panel
import dev.nx.console.settings.NxConsoleSettingBase

class TelemetrySetting() : NxConsoleSettingBase<Boolean> {

    private val checkbox: JBCheckBox = JBCheckBox().apply { text = "Enable Telemetry" }

    override fun render(panel: Panel) {
        panel.apply {
            row {
                cell(checkbox)
                    .comment(
                        "Enable telemetry to help us improve Nx Console.",
                        MAX_LINE_LENGTH_WORD_WRAP
                    )
            }
        }
    }

    override fun getValue(): Boolean = checkbox.isSelected

    override fun setValue(value: Boolean) {
        checkbox.isSelected = value
    }
}
