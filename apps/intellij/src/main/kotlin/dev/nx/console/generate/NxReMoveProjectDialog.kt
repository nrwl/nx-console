package dev.nx.console.generate

import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.IdeActions
import com.intellij.openapi.editor.Document
import com.intellij.openapi.editor.event.BulkAwareDocumentListener
import com.intellij.openapi.keymap.KeymapUtil
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogPanel
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.openapi.ui.ValidationInfo
import com.intellij.ui.TextFieldWithAutoCompletion
import com.intellij.ui.components.JBTextField
import com.intellij.ui.dsl.builder.*
import com.intellij.ui.dsl.gridLayout.HorizontalAlign
import dev.nx.console.models.NxGeneratorContext
import dev.nx.console.models.WorkspaceLayout
import java.awt.event.ActionEvent
import javax.swing.AbstractAction
import javax.swing.Action
import javax.swing.JComponent
import javax.swing.JEditorPane

class NxReMoveProjectDialog(
    val project: Project,
    val mode: String,
    val reMoveGenerators: List<String>,
    val reMoveGeneratorContext: NxGeneratorContext?,
    val projectOptions: Map<String, String>?,
    val workspaceLayout: WorkspaceLayout?,
    val dryRunCallback: (dialog: NxReMoveProjectDialog) -> Unit
) : DialogWrapper(project) {

    init {
        require(mode == "move" || mode == "remove")

        title =
            when (mode) {
                "move" -> "Move Nx Project"
                else -> "Remove Nx Project"
            }

        init()
    }

    private lateinit var panel: DialogPanel
    private lateinit var model: ReMoveProjectDialogModel

    private lateinit var projectField: TextFieldWithAutoCompletion<String>
    private lateinit var destinationField: JBTextField
    private var appsOrLibsText: Cell<JEditorPane>? = null

    fun getResult(): ReMoveProjectDialogModel {
        panel.apply()
        return model
    }

    override fun createCenterPanel(): JComponent {
        val model =
            ReMoveProjectDialogModel(
                reMoveGeneratorContext?.project ?: "",
                reMoveGenerators.find { it.contains("@nrwl/workspace") } ?: reMoveGenerators[0]
            )

        panel =
            panel {
                    row {
                            label("Project:")
                            projectField =
                                TextFieldWithAutoCompletion.create(
                                        project,
                                        projectOptions?.keys ?: emptyList(),
                                        false,
                                        reMoveGeneratorContext?.project
                                    )
                                    .apply {
                                        cell(this)
                                            .bind(
                                                { component -> component.text },
                                                { component, value -> component.text = value },
                                                model::project.toMutableProperty()
                                            )
                                            .comment(getShortcutHint())
                                            .horizontalAlign(HorizontalAlign.FILL)

                                        addDocumentListener(
                                            object : BulkAwareDocumentListener.Simple {
                                                override fun afterDocumentChange(
                                                    document: Document
                                                ) {
                                                    updateDestinationDirHint(document.text)
                                                }
                                            }
                                        )
                                    }
                        }
                        .layout(RowLayout.PARENT_GRID)
                    row {
                            label("Using:")
                            if (reMoveGenerators.size > 1) {
                                comboBox(reMoveGenerators)
                                    .bindItem(model::generator)
                                    .horizontalAlign(HorizontalAlign.FILL)
                            } else {
                                text(reMoveGenerators[0])
                            }
                        }
                        .layout(RowLayout.PARENT_GRID)
                    row {
                            label("Destination:")

                            appsOrLibsText = text("").gap(RightGap.SMALL)
                            updateDestinationDirHint(model.project)

                            destinationField =
                                textField()
                                    .bindText(model::directory)
                                    .horizontalAlign(HorizontalAlign.FILL)
                                    .component
                        }
                        .visible(mode == "move")
                        .layout(RowLayout.PARENT_GRID)
                }
                .withPreferredWidth(400)
        this.model = model
        return panel
    }

    override fun doValidateAll(): MutableList<ValidationInfo> {
        val validationList = mutableListOf<ValidationInfo>()
        panel.apply()
        if (model.project == "") {
            validationList.add(ValidationInfo("Project is required", projectField))
        }
        if (mode == "move" && model.directory == "") {
            validationList.add(ValidationInfo("Destination is required", destinationField))
        }
        return validationList
    }

    override fun createActions(): Array<Action> {
        return arrayOf(cancelAction, DryRunAction() { -> dryRunCallback(this) }, okAction)
    }

    // for some reason kotlin can't resolve DialogWrapperAction
    protected class DryRunAction(val callback: () -> Unit) : AbstractAction("Dry Run") {
        override fun actionPerformed(e: ActionEvent?) {
            callback()
        }
    }
    private fun getShortcutHint(): String {
        return "Use ${
          KeymapUtil.getFirstKeyboardShortcutText(
        ActionManager.getInstance().getAction(IdeActions.ACTION_CODE_COMPLETION)
      )} for project completion\n"
    }

    fun updateDestinationDirHint(projectType: String?) {
        val appOrLibDirByProjectType = getDestinationDirHint(projectOptions?.get(projectType))
        appsOrLibsText?.let {
            if (appOrLibDirByProjectType == "") {
                it.visible(false)
                return
            }
            it.visible(true)
            it.component.text = appOrLibDirByProjectType
        }
    }

    private fun getDestinationDirHint(projectType: String?): String {
        if (workspaceLayout == null) {
            return ""
        }
        if (projectType == "application") {
            return workspaceLayout.appsDir.let {
                if (it.isNullOrEmpty()) {
                    return ""
                }
                "${it}/"
            }
        }
        if (projectType == "library") {
            return workspaceLayout.libsDir.let {
                if (it.isNullOrEmpty()) {
                    return ""
                }
                "${it}/"
            }
        }
        return ""
    }
}

data class ReMoveProjectDialogModel(
    var project: String = "",
    var generator: String = "",
    var directory: String = ""
)
