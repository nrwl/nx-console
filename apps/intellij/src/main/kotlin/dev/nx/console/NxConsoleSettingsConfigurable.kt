package dev.nx.console

import com.intellij.openapi.options.SearchableConfigurable
import com.intellij.ui.dsl.builder.panel
import dev.nx.console.generate.settings.EnableDryRunOnGenerateChangeSetting
import javax.swing.JComponent

class NxConsoleSettingsConfigurable() : SearchableConfigurable {

    private val id = "nx-console"
    private val settingsProvider = NxConsoleSettingsProvider.getInstance()

    private lateinit var enableDryRunOnGenerateChangeSetting: EnableDryRunOnGenerateChangeSetting

    override fun createComponent(): JComponent {
        enableDryRunOnGenerateChangeSetting = EnableDryRunOnGenerateChangeSetting()
        enableDryRunOnGenerateChangeSetting.setValue(settingsProvider.enableDryRunOnGenerateChange)

        return panel { row { cell(enableDryRunOnGenerateChangeSetting.getComponent()) } }
    }

    override fun isModified(): Boolean {
        return enableDryRunOnGenerateChangeSetting.getValue() !=
            settingsProvider.enableDryRunOnGenerateChange
    }

    override fun apply() {
        settingsProvider.enableDryRunOnGenerateChange =
            enableDryRunOnGenerateChangeSetting.getValue()
    }

    override fun getDisplayName(): String {
        return "Nx Console"
    }

    override fun getId(): String {
        return id
    }
}

interface NxConsoleSettingBase<T> {
    fun getComponent(): JComponent

    fun getValue(): T

    fun setValue(value: T): Unit
}
