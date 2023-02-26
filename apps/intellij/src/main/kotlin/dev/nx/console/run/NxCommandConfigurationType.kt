package dev.nx.console.run

import com.intellij.execution.configurations.ConfigurationFactory
import com.intellij.execution.configurations.ConfigurationTypeUtil
import com.intellij.execution.configurations.RunConfiguration
import com.intellij.execution.configurations.SimpleConfigurationType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.NotNullLazyValue
import dev.nx.console.NxIcons

class NxCommandConfigurationType :
    SimpleConfigurationType(
        "NxRunConfigurationType",
        "Nx",
        "Nx command execution",
        NotNullLazyValue.createConstantValue(NxIcons.Action)
    ) {
    override fun createTemplateConfiguration(project: Project): RunConfiguration {
        return NxCommandConfiguration(project, this)
    }

    val factory: ConfigurationFactory
        get() = configurationFactories.single()

    companion object {
        fun getInstance() =
            ConfigurationTypeUtil.findConfigurationType(NxCommandConfigurationType::class.java)
    }
}
