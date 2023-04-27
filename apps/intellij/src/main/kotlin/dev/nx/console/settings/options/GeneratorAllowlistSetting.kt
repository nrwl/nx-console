package dev.nx.console.settings.options

import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBTextField
import com.intellij.ui.dsl.builder.Panel
import dev.nx.console.settings.NxConsoleSettingBase

class GeneratorAllowlistSetting(val project: Project) : NxConsoleSettingBase<String?> {

    private val inputField: JBTextField = JBTextField().apply { text = "Allowed generators" }
    override fun render(panel: Panel) {
        panel.apply { row { cell(inputField) } }
    }

    override fun getValue(): String? = inputField.text.ifEmpty { null }

    override fun setValue(value: String?) {
        if (value == null) return
        this.inputField.text = value
    }
}
