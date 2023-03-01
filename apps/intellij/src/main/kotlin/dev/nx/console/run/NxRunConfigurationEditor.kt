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
        nxProjects.text = configuration.nxProjects
        nxTargets.text = configuration.nxTargets
        environmentVariables.envData = configuration.environmentVariables
        arguments.text = configuration.arguments
    }

    override fun applyEditorTo(configuration: NxCommandConfiguration) {
        configuration.nxProjects = nxProjects.text
        configuration.nxTargets = nxTargets.text
        configuration.environmentVariables = environmentVariables.envData
        configuration.arguments = arguments.text
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
