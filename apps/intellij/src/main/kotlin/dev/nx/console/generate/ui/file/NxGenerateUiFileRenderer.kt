package dev.nx.console.generate.ui.file

import com.intellij.notification.NotificationType
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.ui.jcef.JBCefApp
import dev.nx.console.generate.run_generator.RunGeneratorManager
import dev.nx.console.generate.ui.NxGenerateUiRenderer
import dev.nx.console.models.NxGenerator
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.ui.Notifier

class NxGenerateUiFileRenderer : NxGenerateUiRenderer {
    override fun openGenerateUi(
        project: Project,
        nxGenerator: NxGenerator,
        runGeneratorManager: RunGeneratorManager
    ) {
        if (!JBCefApp.isSupported()) {
            Notifier.notifyAnything(
                project,
                "Can't open the Generate UI. Your IDE doesn't support JCEF - please use the bundled JetBrains Runtime (JBR) instead of an alternative OpenJDK.",
                NotificationType.ERROR
            )
            return
        }
        val virtualFile =
            if (NxConsoleSettingsProvider.getInstance().useNewGenerateUIPreview)
                V2NxGenerateUiFile("Generate", project, runGeneratorManager)
            else DefaultNxGenerateUiFile("Generate", runGeneratorManager)

        val fileEditorManager = FileEditorManager.getInstance(project)
        if (fileEditorManager.isFileOpen(virtualFile)) {
            fileEditorManager.closeFile(virtualFile)
        }

        fileEditorManager.openFile(virtualFile, true)

        virtualFile.setupGeneratorForm(nxGenerator)
    }
}
