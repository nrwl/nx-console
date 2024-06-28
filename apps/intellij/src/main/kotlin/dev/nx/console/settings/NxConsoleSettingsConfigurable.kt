package dev.nx.console.settings

import com.intellij.openapi.options.SearchableConfigurable
import com.intellij.openapi.project.Project
import com.intellij.ui.dsl.builder.Panel
import com.intellij.ui.dsl.builder.panel
import dev.nx.console.settings.options.*
import javax.swing.JComponent

class NxConsoleSettingsConfigurable(val project: Project) : SearchableConfigurable {

    private val id = "nx-console"
    private val settingsProvider = NxConsoleSettingsProvider.getInstance()
    private val projectSettingsProvider = NxConsoleProjectSettingsProvider.getInstance(project)

    // project settings
    private lateinit var workspacePathSetting: WorkspacePathSetting
    private lateinit var generatorFiltersSetting: GeneratorFiltersSetting
    private lateinit var toolWindowStyleSetting: ToolWindowStyleSetting

    // application settings
    private lateinit var enableDryRunOnGenerateChangeSetting: EnableDryRunOnGenerateChangeSetting
    private lateinit var telemetrySetting: TelemetrySetting
    private lateinit var showProjectDetailsViewSetting: ShowProjectDetailsViewSetting

    override fun createComponent(): JComponent {
        // project settings
        workspacePathSetting = WorkspacePathSetting(project)
        workspacePathSetting.setValue(projectSettingsProvider.workspacePath)

        generatorFiltersSetting = GeneratorFiltersSetting(project)
        generatorFiltersSetting.setValue(projectSettingsProvider.generatorFilters)

        toolWindowStyleSetting = ToolWindowStyleSetting(project)
        toolWindowStyleSetting.setValue(projectSettingsProvider.toolwindowStyle)

        // application settings
        enableDryRunOnGenerateChangeSetting = EnableDryRunOnGenerateChangeSetting()
        enableDryRunOnGenerateChangeSetting.setValue(settingsProvider.enableDryRunOnGenerateChange)

        telemetrySetting = TelemetrySetting()
        telemetrySetting.setValue(settingsProvider.enableTelemetry)

        showProjectDetailsViewSetting = ShowProjectDetailsViewSetting()
        showProjectDetailsViewSetting.setValue(settingsProvider.showProjectDetailsView)

        return panel {
            group("Project Settings") {
                workspacePathSetting.render(this)
                generatorFiltersSetting.render(this)
                toolWindowStyleSetting.render(this)
            }
            group("Application Settings") {
                enableDryRunOnGenerateChangeSetting.render(this)
                telemetrySetting.render(this)
                showProjectDetailsViewSetting.render(this)
            }
        }
    }

    override fun isModified(): Boolean {
        return enableDryRunOnGenerateChangeSetting.getValue() !=
            settingsProvider.enableDryRunOnGenerateChange ||
            telemetrySetting.getValue() != settingsProvider.enableTelemetry ||
            workspacePathSetting.getValue() != projectSettingsProvider.workspacePath ||
            generatorFiltersSetting.getValue() != projectSettingsProvider.generatorFilters ||
            toolWindowStyleSetting.getValue() != projectSettingsProvider.toolwindowStyle ||
            showProjectDetailsViewSetting.getValue() != settingsProvider.showProjectDetailsView
    }

    override fun apply() {
        // project settings
        projectSettingsProvider.workspacePath = workspacePathSetting.getValue()
        projectSettingsProvider.generatorFilters = generatorFiltersSetting.getValue()
        projectSettingsProvider.toolwindowStyle = toolWindowStyleSetting.getValue()

        workspacePathSetting.doApply()
        toolWindowStyleSetting.doApply()

        // application settings
        settingsProvider.enableDryRunOnGenerateChange =
            enableDryRunOnGenerateChangeSetting.getValue()
        settingsProvider.enableTelemetry = telemetrySetting.getValue()
        settingsProvider.showProjectDetailsView = showProjectDetailsViewSetting.getValue()
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
