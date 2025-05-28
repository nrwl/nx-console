package dev.nx.console.settings.options

import com.intellij.openapi.ui.ComboBox
import com.intellij.ui.dsl.builder.Panel
import com.intellij.ui.dsl.builder.RowLayout
import dev.nx.console.settings.NxConsoleSettingBase

enum class NxCloudNotificationsLevel(private val displayName: String) {
    ALL("All"),
    ERRORS("Errors only"),
    NONE("None");

    override fun toString() = displayName
}

class NxCloudNotificationsSetting : NxConsoleSettingBase<NxCloudNotificationsLevel> {
    private val comboBoxField: ComboBox<NxCloudNotificationsLevel> =
        ComboBox<NxCloudNotificationsLevel>().apply {
            addItem(NxCloudNotificationsLevel.ALL)
            addItem(NxCloudNotificationsLevel.ERRORS)
            addItem(NxCloudNotificationsLevel.NONE)
        }

    override fun render(panel: Panel) {
        panel.apply {
            row {
                label("Nx Cloud Notifications")
                cell(comboBoxField)
                    .comment(
                        "Choose when to show notifications for CI Pipeline Executions from Nx Cloud"
                    )
            }
                .layout(RowLayout.PARENT_GRID)
        }
    }

    override fun getValue(): NxCloudNotificationsLevel = comboBoxField.item

    override fun setValue(value: NxCloudNotificationsLevel) {
        comboBoxField.item = value
    }
}