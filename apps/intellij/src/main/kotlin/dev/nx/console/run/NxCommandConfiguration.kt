package dev.nx.console.run

import com.intellij.execution.Executor
import com.intellij.execution.configuration.EnvironmentVariablesData
import com.intellij.execution.configurations.*
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.openapi.options.SettingsEditor
import com.intellij.openapi.project.Project
import org.jdom.Element

class NxCommandConfiguration(project: Project, factory: ConfigurationFactory) :
    LocatableConfigurationBase<RunProfileState>(project, factory, "Nx"),
    RunConfigurationWithSuppressedDefaultDebugAction {

    var nxProjects: String = ""
    var nxTargets: String = ""
    var environmentVariables: EnvironmentVariablesData = EnvironmentVariablesData.DEFAULT
    var arguments: String = ""

    override fun getState(executor: Executor, environment: ExecutionEnvironment): RunProfileState? {
        return NxCommandLineState(environment, this)
    }

    override fun getConfigurationEditor(): SettingsEditor<out RunConfiguration> {
        return NxRunConfigurationEditor()
    }

    override fun writeExternal(element: Element) {
        super.writeExternal(element)
        element.writeString("nx-projects", this.nxProjects)
        element.writeString("nx-targets", this.nxTargets)
        environmentVariables.writeExternal(element)
        element.writeString("arguments", this.arguments)
    }

    override fun readExternal(element: Element) {
        super.readExternal(element)
        this.nxProjects = element.readString("nx-projects") ?: return
        this.nxTargets = element.readString("nx-targets") ?: return
        this.environmentVariables = EnvironmentVariablesData.readExternal(element)
        this.arguments = element.readString("arguments") ?: return
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
