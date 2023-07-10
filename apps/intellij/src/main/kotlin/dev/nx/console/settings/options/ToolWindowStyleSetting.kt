package dev.nx.console.settings.options

import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.ComboBox
import com.intellij.ui.dsl.builder.Panel
import com.intellij.ui.dsl.builder.RowLayout
import com.intellij.util.messages.Topic
import dev.nx.console.settings.NxConsoleSettingBase

enum class ToolWindowStyles(private val displayName: String) {
    LIST("List"),
    FOLDER("Folder"),
    AUTOMATIC("Automatic");

    override fun toString() = displayName
}

val NX_TOOLWINDOW_STYLE_SETTING_TOPIC: Topic<NxToolWindowStyleSettingListener> =
    Topic("NxToolWindowStyleSetting", NxToolWindowStyleSettingListener::class.java)

interface NxToolWindowStyleSettingListener {
    fun onNxToolWindowStyleChange()
}

class ToolWindowStyleSetting(val project: Project) : NxConsoleSettingBase<ToolWindowStyles> {
    private val comboBoxField: ComboBox<ToolWindowStyles> =
        ComboBox<ToolWindowStyles>().apply {
            addItem(ToolWindowStyles.LIST)
            addItem(ToolWindowStyles.FOLDER)
            addItem(ToolWindowStyles.AUTOMATIC)
        }

    override fun render(panel: Panel) {
        panel.apply {
            row {
                    label("Nx Toolwindow Style")
                    cell(comboBoxField)
                        .comment(
                            "Controls how the Nx Toolwindow renders projects & targets: As a long list, a tree based on the folder structure or switching between the two based on the amount of projects."
                        )
                }
                .layout(RowLayout.PARENT_GRID)
        }
    }

    override fun getValue(): ToolWindowStyles = comboBoxField.item

    override fun setValue(value: ToolWindowStyles) {
        comboBoxField.item = value
    }

    override fun doApply() {
        project.messageBus
            .syncPublisher(NX_TOOLWINDOW_STYLE_SETTING_TOPIC)
            .onNxToolWindowStyleChange()
    }
}
