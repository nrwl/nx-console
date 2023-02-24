package dev.nx.console.nxls

import com.intellij.ui.components.JBTextField
import com.intellij.ui.dsl.builder.MAX_LINE_LENGTH_WORD_WRAP
import com.intellij.ui.dsl.builder.Panel
import com.intellij.ui.dsl.gridLayout.HorizontalAlign
import dev.nx.console.settings.NxConsoleSettingBase

class WorkspacePathSetting : NxConsoleSettingBase<String?> {

    private val inputField = JBTextField()
    override fun render(panel: Panel) {
        panel.apply {
            row {
                label("Workspace path")
                cell(inputField)
                    .horizontalAlign(HorizontalAlign.FILL)
                    .comment(
                        "Set this if your Nx workspace is not at the root of the project opened in IntelliJ",
                        MAX_LINE_LENGTH_WORD_WRAP
                    )
            }
        }
    }

    override fun getValue(): String? {
        return this.inputField.text
    }

    override fun setValue(value: String?) {
        this.inputField.text = value
    }
}
