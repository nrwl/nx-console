package dev.nx.console.run

import com.intellij.execution.configuration.EnvironmentVariablesComponent
import com.intellij.openapi.options.SettingsEditor
import com.intellij.ui.RawCommandLineEditor
import com.intellij.ui.components.JBTextField
import com.intellij.ui.components.fields.ExpandableTextField
import com.intellij.ui.dsl.builder.AlignX
import com.intellij.ui.dsl.builder.panel
import com.intellij.util.ui.ComponentWithEmptyText
import javax.swing.JComponent

class NxRunConfigurationEditor : SettingsEditor<NxCommandConfiguration>() {

    private lateinit var nxProjectsField: ExpandableTextField
    private lateinit var nxTargetsField: ExpandableTextField
    private lateinit var nxTargetsConfigurationField: JBTextField

    private val environmentVariablesField = EnvironmentVariablesComponent()
    private val argumentsField =
        RawCommandLineEditor().apply {
            if (textField is ComponentWithEmptyText) {
                (textField as ComponentWithEmptyText).emptyText.text =
                    "Additional flags, e.g. --skip-cache, or --parallel=2"
            }
        }

    override fun resetEditorFrom(configuration: NxCommandConfiguration) {
        val nxRunSettings = configuration.nxRunSettings
        nxProjectsField.text = nxRunSettings.nxProjects
        nxTargetsField.text = nxRunSettings.nxTargets
        nxTargetsConfigurationField.text = nxRunSettings.nxTargetsConfiguration
        environmentVariablesField.envData = nxRunSettings.environmentVariables
        argumentsField.text = nxRunSettings.arguments
    }

    override fun applyEditorTo(configuration: NxCommandConfiguration) {
        configuration.nxRunSettings =
            NxRunSettings(
                nxProjects = nxProjectsField.text,
                nxTargets = nxTargetsField.text,
                nxTargetsConfiguration = nxTargetsConfigurationField.text,
                environmentVariables = environmentVariablesField.envData,
                arguments = argumentsField.text,
            )
    }

    override fun createEditor(): JComponent {
        return panel {
            row("&Projects:") {
                nxProjectsField =
                    expandableTextField()
                        .comment("Nx projects separated with commas, e.g. 'project1,project2'")
                        .align(AlignX.FILL)
                        .component
            }
            row("&Targets:") {
                nxTargetsField =
                    expandableTextField()
                        .comment("Nx targets separated with commas, e.g. 'lint,test'")
                        .align(AlignX.FILL)
                        .component
            }
            row("Configuration:") {
                nxTargetsConfigurationField =
                    textField()
                        .comment(
                            "Nx target configuration that will be used for all targets (if it exists), e.g. 'production'"
                        )
                        .align(AlignX.FILL)
                        .component
            }
            row(environmentVariablesField.label) {
                cell(environmentVariablesField.component).align(AlignX.FILL)
            }
            row("A&rguments:") { cell(argumentsField).align(AlignX.FILL) }
        }
    }
}
