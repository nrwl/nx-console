package dev.nx.console.run

import com.intellij.execution.actions.ConfigurationContext
import com.intellij.execution.actions.LazyRunConfigurationProducer
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
    val arguments: String = ""
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
            createRunSettingsFromContext(
                NxRunSettings(
                    configuration.nxProjects,
                    configuration.nxTargets,
                    configuration.arguments
                ),
                context,
                sourceElement
            )

        if (runSettings == null) {
            return false
        } else {
            setupConfigurationFromSettings(configuration, runSettings)
            return true
        }
    }

    private fun setupConfigurationFromSettings(
        configuration: NxCommandConfiguration,
        runSettings: NxRunSettings
    ) {
        // configuration.setRunSettings(runSettings)
        configuration.nxProjects = runSettings.nxProjects
        configuration.nxTargets = runSettings.nxTargets
        configuration.arguments = runSettings.arguments

        // configuration.name = "${runSettings.nxProjects}[${runSettings.nxTargets}]"
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

                        NxRunSettings(
                            nxProjects = nxProject,
                            nxTargets = nxTarget,
                            arguments = "",
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
            createRunSettingsFromContext(
                NxRunSettings(
                    configuration.nxProjects,
                    configuration.nxTargets,
                    configuration.arguments
                ),
                context,
                null
            )
        return if (thisRunSettings == null) false
        else isConfigurationMatched(configuration, thisRunSettings)
    }

    private fun isConfigurationMatched(
        configuration: NxCommandConfiguration,
        thisRunSettings: NxRunSettings
    ): Boolean {
        return configuration.nxProjects == thisRunSettings.nxProjects &&
            configuration.nxTargets == thisRunSettings.nxTargets
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
