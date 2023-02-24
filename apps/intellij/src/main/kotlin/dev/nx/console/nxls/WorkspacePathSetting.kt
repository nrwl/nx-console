package dev.nx.console.nxls

import com.intellij.ui.components.JBTextField
import dev.nx.console.settings.NxConsoleSettingBase
import javax.swing.JComponent

class WorkspacePathSetting : NxConsoleSettingBase<String?> {

    private val inputField = JBTextField()
    override fun getComponent(): JComponent {
        return this.inputField
    }

    override fun getLabel(): String {
        return "Workspace path"
    }

    override fun getValue(): String? {
        return this.inputField.text
    }

    override fun setValue(value: String?) {
        this.inputField.text = value
    }
}
