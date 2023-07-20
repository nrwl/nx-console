package dev.nx.console.settings.options

import com.intellij.openapi.components.service
import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.TextFieldWithBrowseButton
import com.intellij.openapi.ui.emptyText
import com.intellij.ui.components.textFieldWithBrowseButton
import com.intellij.ui.dsl.builder.MAX_LINE_LENGTH_WORD_WRAP
import com.intellij.ui.dsl.builder.Panel
import com.intellij.ui.dsl.builder.RowLayout
import com.intellij.ui.dsl.gridLayout.HorizontalAlign
import dev.nx.console.services.NxlsService
import dev.nx.console.settings.NxConsoleSettingBase
import java.nio.file.Paths

class WorkspacePathSetting(val project: Project) : NxConsoleSettingBase<String?> {

    private val inputField: TextFieldWithBrowseButton

    init {
        val descriptor = FileChooserDescriptorFactory.createSingleFolderDescriptor()
        inputField =
            textFieldWithBrowseButton(project, "Nx workspace root", descriptor) {
                Paths.get(project.basePath ?: "").relativize(Paths.get(it.path)).toString()
            }
    }
    override fun render(panel: Panel) {
        panel.apply {
            row {
                    label("Workspace path")
                    cell(inputField)
                        .horizontalAlign(HorizontalAlign.FILL)
                        .comment(
                            "Set this if your Nx workspace is not at the root of the currently opened project. Relative to the project base path.",
                            MAX_LINE_LENGTH_WORD_WRAP
                        )
                        .apply { component.emptyText.text = "./" }
                }
                .layout(RowLayout.PARENT_GRID)
        }
    }

    override fun doApply() {
        (getValue() ?: project.basePath)?.apply {
            project.service<NxlsService>().changeWorkspace(this)
        }
    }

    override fun getValue(): String? = inputField.text.ifEmpty { null }

    override fun setValue(value: String?) {
        if (value == null) return
        this.inputField.text = value
    }
}
