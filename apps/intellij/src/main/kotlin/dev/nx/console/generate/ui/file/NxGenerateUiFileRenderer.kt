package dev.nx.console.generate.ui.file

import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import dev.nx.console.generate.run_generator.RunGeneratorManager
import dev.nx.console.generate.ui.NxGenerateUiRenderer
import dev.nx.console.models.NxGenerator
import dev.nx.console.settings.NxConsoleSettingsProvider

class NxGenerateUiFileRenderer : NxGenerateUiRenderer {
    override fun openGenerateUi(
        project: Project,
        nxGenerator: NxGenerator,
        runGeneratorManager: RunGeneratorManager
    ) {
        val virtualFile =
            if (NxConsoleSettingsProvider.getInstance().useNewGenerateUIPreview)
                V2NxGenerateUiFile("Generate", runGeneratorManager)
            else DefaultNxGenerateUiFile("Generate", runGeneratorManager)

        val fileEditorManager = FileEditorManager.getInstance(project)
        if (fileEditorManager.isFileOpen(virtualFile)) {
            fileEditorManager.closeFile(virtualFile)
        }

        fileEditorManager.openFile(virtualFile, true)

        virtualFile.setupGeneratorForm(nxGenerator)
    }
}
