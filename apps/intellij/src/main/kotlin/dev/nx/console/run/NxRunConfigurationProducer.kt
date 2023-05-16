package dev.nx.console.run

import com.intellij.execution.actions.ConfigurationContext
import com.intellij.execution.actions.LazyRunConfigurationProducer
import com.intellij.execution.configuration.EnvironmentVariablesData
import com.intellij.execution.configurations.ConfigurationFactory
import com.intellij.openapi.util.Ref
import com.intellij.psi.PsiElement
import dev.nx.console.utils.getNxTargetDescriptorFromNode
import dev.nx.console.utils.getPropertyNodeFromLeafNode

data class NxRunSettings(
    val nxProjects: String = "",
    val nxTargets: String = "",
    val nxTargetsConfiguration: String? = "",
    val arguments: String = "",
    var environmentVariables: EnvironmentVariablesData = EnvironmentVariablesData.DEFAULT
)

class NxRunConfigurationProducer : LazyRunConfigurationProducer<NxCommandConfiguration>() {
    override fun getConfigurationFactory(): ConfigurationFactory =
        NxCommandConfigurationType.getInstance()

    override fun setupConfigurationFromContext(
        configuration: NxCommandConfiguration,
        context: ConfigurationContext,
        sourceElement: Ref<PsiElement>
    ): Boolean {
        val runSettings =
            createRunSettingsFromContext(configuration.nxRunSettings, context, sourceElement)
                ?: return false
        setupConfigurationFromSettings(configuration, runSettings)
        return true
    }

    private fun setupConfigurationFromSettings(
        configuration: NxCommandConfiguration,
        runSettings: NxRunSettings
    ) {
        configuration.nxRunSettings = runSettings
        configuration.setGeneratedName()
    }

    private fun createRunSettingsFromContext(
        runSettings: NxRunSettings,
        context: ConfigurationContext,
        sourceElement: Ref<PsiElement>?
    ): NxRunSettings? {
        val element = getElement(context) ?: return null
        val targetNode = getPropertyNodeFromLeafNode(element) ?: return null
        val targetDescriptor = getNxTargetDescriptorFromNode(targetNode) ?: return null
        sourceElement?.set(element)
        return runSettings.copy(
            nxProjects = targetDescriptor.nxProject,
            nxTargets = targetDescriptor.nxTarget,
        )
    }

    override fun isConfigurationFromContext(
        configuration: NxCommandConfiguration,
        context: ConfigurationContext
    ): Boolean {

        val thisRunSettings =
            createRunSettingsFromContext(configuration.nxRunSettings, context, null)
        return if (thisRunSettings == null) false
        else isConfigurationMatched(configuration, thisRunSettings)
    }

    private fun isConfigurationMatched(
        configuration: NxCommandConfiguration,
        thisRunSettings: NxRunSettings
    ): Boolean {
        return configuration.nxRunSettings.nxProjects == thisRunSettings.nxProjects &&
            configuration.nxRunSettings.nxTargets == thisRunSettings.nxTargets &&
            configuration.nxRunSettings.nxTargetsConfiguration ==
                thisRunSettings.nxTargetsConfiguration
    }

    private fun getElement(context: ConfigurationContext): PsiElement? {
        val location = context.location
        return location?.psiElement
    }
}
