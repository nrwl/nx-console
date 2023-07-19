package dev.nx.console.generate.ui

import com.intellij.openapi.extensions.ExtensionPointName
import com.intellij.openapi.project.Project
import dev.nx.console.generate.run_generator.RunGeneratorManager
import dev.nx.console.models.NxGenerator

interface NxGenerateUiRenderer {
    fun openGenerateUi(
        project: Project,
        nxGenerator: NxGenerator,
        runGeneratorManager: RunGeneratorManager
    )

    companion object {
        val EP_NAME: ExtensionPointName<NxGenerateUiRenderer> =
            ExtensionPointName.create("dev.nx.console.nxGenerateUiRenderer")
    }
}
