package dev.nx.console.run

import com.intellij.execution.Executor
import com.intellij.execution.configuration.EnvironmentVariablesData
import com.intellij.execution.configurations.*
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.javascript.nodejs.debug.NodeDebugRunConfiguration
import com.intellij.openapi.options.SettingsEditor
import com.intellij.openapi.project.Project
import org.jdom.Element

class NxCommandConfiguration(project: Project, factory: ConfigurationFactory) :
    LocatableConfigurationBase<RunProfileState>(project, factory, "Nx"), NodeDebugRunConfiguration {

    var nxRunSettings = NxRunSettings()

    override fun getState(executor: Executor, environment: ExecutionEnvironment): RunProfileState {
        return NxCommandLineState(environment, this)
    }

    override fun getConfigurationEditor(): SettingsEditor<out RunConfiguration> {
        return NxRunConfigurationEditor()
    }

    override fun writeExternal(element: Element) {
        super.writeExternal(element)
        element.writeString("nx-projects", nxRunSettings.nxProjects)
        element.writeString("nx-targets", nxRunSettings.nxTargets)
        element.writeString("nx-target-configuration", nxRunSettings.nxTargetsConfiguration)
        nxRunSettings.environmentVariables.writeExternal(element)
        element.writeString("arguments", nxRunSettings.arguments)
    }

    override fun readExternal(element: Element) {
        super.readExternal(element)
        nxRunSettings =
            NxRunSettings(
                nxProjects = element.readString("nx-projects") ?: return,
                nxTargets = element.readString("nx-targets") ?: return,
                nxTargetsConfiguration = element.readString("nx-target-configuration") ?: "",
                environmentVariables = EnvironmentVariablesData.readExternal(element),
                arguments = element.readString("arguments") ?: return,
            )
    }

    override fun suggestedName(): String {
        if (nxRunSettings.nxProjects.isEmpty() || nxRunSettings.nxTargets.isEmpty()) {
            return ""
        }

        if (',' in nxRunSettings.nxTargets) {
            return "${nxRunSettings.nxProjects} --targets=${nxRunSettings.nxTargets} ${if(nxRunSettings.nxTargetsConfiguration.isBlank().not()) "-c ${nxRunSettings.nxTargetsConfiguration}" else ""}"
        }

        return "${nxRunSettings.nxProjects}:${nxRunSettings.nxTargets}${if(nxRunSettings.nxTargetsConfiguration.isBlank().not()) ":${nxRunSettings.nxTargetsConfiguration}" else ""}"
    }
}

fun Element.writeString(name: String, value: String) {
    val opt = Element("option")
    opt.setAttribute("name", name)
    opt.setAttribute("value", value)
    addContent(opt)
}

fun Element.readString(name: String): String? =
    children
        .find { it.name == "option" && it.getAttributeValue("name") == name }
        ?.getAttributeValue("value")
