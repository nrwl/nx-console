package dev.nx.console.run

import com.intellij.execution.actions.ConfigurationContext
import com.intellij.execution.actions.LazyRunConfigurationProducer
import com.intellij.execution.configuration.EnvironmentVariablesData
import com.intellij.execution.configurations.ConfigurationFactory
import com.intellij.json.psi.JsonFile
import com.intellij.json.psi.JsonObject
import com.intellij.json.psi.JsonProperty
import com.intellij.json.psi.JsonStringLiteral
import com.intellij.openapi.util.Ref
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.util.parentOfType

data class NxRunSettings(
    val nxProjects: String = "",
    val nxTargets: String = "",
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
        return createRunSettingsFromContext(configuration.nxRunSettings, context, sourceElement)
            ?.also { setupConfigurationFromSettings(configuration, it) } == null
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
        val element = getElement(context)
        if (element != null && element.isValid) {
            val psiProjectJsonFile = getContainingProjectJsonFile(element)
            if (psiProjectJsonFile == null) {
                return null
            } else {
                val virtualPackageJson = psiProjectJsonFile.virtualFile
                if (virtualPackageJson == null) {
                    return null
                } else {
                    val targetProperty = findContainingProperty(element)
                    return if (targetProperty == null) {
                        null
                    } else {
                        val propertyLiteral = element.parent as? JsonStringLiteral
                        val nxTarget = propertyLiteral?.value ?: return null
                        val nxProject =
                            (((propertyLiteral.parent as? JsonProperty)
                                        ?.parentOfType<JsonObject>()
                                        ?.parentOfType<JsonObject>()
                                        ?.findProperty("name") as JsonProperty)
                                    .value as JsonStringLiteral)
                                .value
                        sourceElement?.set(targetProperty)
                        return runSettings.copy(
                            nxProjects = nxProject,
                            nxTargets = nxTarget,
                        )
                    }
                }
            }
        } else {
            return null
        }
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
            configuration.nxRunSettings.nxTargets == thisRunSettings.nxTargets
    }

    private fun getElement(context: ConfigurationContext): PsiElement? {
        val location = context.location
        return location?.psiElement
    }
}

fun getContainingProjectJsonFile(element: PsiElement): JsonFile? {
    val file = element.containingFile
    return if (isProjectJsonFile(file)) file as JsonFile else null
}

fun isProjectJsonFile(file: PsiFile): Boolean {
    return file is JsonFile && ("project.json" == file.getName())
}
