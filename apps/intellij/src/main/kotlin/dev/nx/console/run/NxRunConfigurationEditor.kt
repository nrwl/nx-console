package dev.nx.console.run

import com.intellij.execution.configuration.EnvironmentVariablesComponent
import com.intellij.openapi.options.SettingsEditor
import com.intellij.ui.RawCommandLineEditor
import com.intellij.ui.components.fields.ExpandableTextField
import com.intellij.ui.layout.panel
import com.intellij.util.ui.ComponentWithEmptyText
import javax.swing.JComponent

class NxRunConfigurationEditor : SettingsEditor<NxCommandConfiguration>() {

    private val nxProjects = ExpandableTextField()
    private val nxTargets = ExpandableTextField()
    private val environmentVariables = EnvironmentVariablesComponent()
    private val arguments =
        RawCommandLineEditor().apply {
            if (textField is ComponentWithEmptyText) {
                (textField as ComponentWithEmptyText).emptyText.text =
                    "Additional flags, e.g. --skip-cache, or --parallel=2"
            }
        }

    override fun resetEditorFrom(configuration: NxCommandConfiguration) {
        val nxRunSettings = configuration.nxRunSettings
        nxProjects.text = nxRunSettings.nxProjects
        nxTargets.text = nxRunSettings.nxTargets
        environmentVariables.envData = nxRunSettings.environmentVariables
        arguments.text = nxRunSettings.arguments
    }

    override fun applyEditorTo(configuration: NxCommandConfiguration) {
        configuration.nxRunSettings =
            NxRunSettings(
                nxProjects = nxProjects.text,
                nxTargets = nxTargets.text,
                environmentVariables = environmentVariables.envData,
                arguments = arguments.text,
            )
    }

    override fun createEditor(): JComponent {
        return panel {
            row("&Projects:") {
                nxProjects(growX, pushX)
                    .comment("Nx projects separated with commas, e.g. 'project1,project2'")
            }
            row("&Targets:") {
                nxTargets(growX, pushX)
                    .comment("Nx targets separated with commas, e.g. 'lint,test'")
            }
            row(environmentVariables.label) { environmentVariables(growX) }
            row("A&rguments:") { arguments(growX, pushX) }
        }
    }
}
