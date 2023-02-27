package dev.nx.console.settings

import com.intellij.openapi.options.SearchableConfigurable
import com.intellij.openapi.project.Project
import com.intellij.ui.dsl.builder.Panel
import com.intellij.ui.dsl.builder.panel
import dev.nx.console.generate.settings.EnableDryRunOnGenerateChangeSetting
import dev.nx.console.nxls.WorkspacePathSetting
import javax.swing.JComponent

class NxConsoleSettingsConfigurable(val project: Project) : SearchableConfigurable {

    private val id = "nx-console"
    private val settingsProvider = NxConsoleSettingsProvider.getInstance()
    private val projectSettingsProvider = NxConsoleProjectSettingsProvider.getInstance(project)

    private lateinit var enableDryRunOnGenerateChangeSetting: EnableDryRunOnGenerateChangeSetting
    private lateinit var workspacePathSetting: WorkspacePathSetting

    override fun createComponent(): JComponent {
        enableDryRunOnGenerateChangeSetting = EnableDryRunOnGenerateChangeSetting()
        enableDryRunOnGenerateChangeSetting.setValue(settingsProvider.enableDryRunOnGenerateChange)

        workspacePathSetting = WorkspacePathSetting(project)
        workspacePathSetting.setValue(projectSettingsProvider.workspacePath)

        return panel {
            group("Project Settings") { workspacePathSetting.render(this) }
            group("Application Settings") { enableDryRunOnGenerateChangeSetting.render(this) }
        }
    }

    override fun isModified(): Boolean {
        return enableDryRunOnGenerateChangeSetting.getValue() !=
            settingsProvider.enableDryRunOnGenerateChange ||
            workspacePathSetting.getValue() != projectSettingsProvider.workspacePath
    }

    override fun apply() {
        settingsProvider.enableDryRunOnGenerateChange =
            enableDryRunOnGenerateChangeSetting.getValue()
        projectSettingsProvider.workspacePath = workspacePathSetting.getValue()

        workspacePathSetting.doApply()
    }

    override fun getDisplayName(): String {
        return "Nx Console"
    }

    override fun getId(): String {
        return id
    }
}

interface NxConsoleSettingBase<T> {
    fun render(panel: Panel): Unit

    fun getValue(): T

    fun setValue(value: T): Unit

    fun doApply(): Unit {
        return
    }
}
