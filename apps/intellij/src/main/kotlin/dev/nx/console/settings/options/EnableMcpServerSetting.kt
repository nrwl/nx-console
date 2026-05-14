package dev.nx.console.settings.options

import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.dsl.builder.Panel
import dev.nx.console.settings.NxConsoleSettingBase

class EnableMcpServerSetting(val project: Project) : NxConsoleSettingBase<Boolean> {

    private val checkbox: JBCheckBox = JBCheckBox().apply { text = "Enable Nx MCP Server" }

    override fun render(panel: Panel) {
        panel.apply {
            row {
                cell(checkbox)
                    .comment(
                        "When disabled, Nx Console will not write the Nx MCP server entry into .idea/workspace.xml."
                    )
            }
        }
    }

    override fun getValue(): Boolean = checkbox.isSelected

    override fun setValue(value: Boolean) {
        checkbox.isSelected = value
    }
}
