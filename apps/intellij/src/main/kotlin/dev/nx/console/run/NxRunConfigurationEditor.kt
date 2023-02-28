package dev.nx.console.run

import com.intellij.execution.configuration.EnvironmentVariablesComponent
import com.intellij.openapi.options.SettingsEditor
import com.intellij.ui.EditorTextField
import com.intellij.ui.RawCommandLineEditor
import com.intellij.ui.layout.panel
import javax.swing.JComponent

class NxRunConfigurationEditor : SettingsEditor<NxCommandConfiguration>() {

    private val nxProjects = EditorTextField()
    private val nxTargets = EditorTextField()
    private val environmentVariables = EnvironmentVariablesComponent()
    private val arguments = RawCommandLineEditor()

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
            row("Nx &Projects:") { nxProjects(growX, pushX) }
            row("Nx &Targets:") { nxTargets(growX, pushX) }
            row(environmentVariables.label) { environmentVariables(growX) }
            row("A&rguments:") { arguments(growX, pushX) }
        }
    }
}
