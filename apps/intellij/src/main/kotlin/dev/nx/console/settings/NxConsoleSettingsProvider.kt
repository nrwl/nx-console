package dev.nx.console.settings

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.components.service

@State(name = "NxConsoleSettingsProvider", storages = [Storage("nx-console.xml")])
class NxConsoleSettingsProvider : PersistentStateComponent<NxConsoleSettingsState> {

    private var state = NxConsoleSettingsState()
    override fun getState(): NxConsoleSettingsState {
        return state
    }

    override fun loadState(state: NxConsoleSettingsState) {
        this.state = state
    }

    var enableDryRunOnGenerateChange: Boolean
        get() = state.enableDryRunOnGenerateChange
        set(value) {
            state.enableDryRunOnGenerateChange = value
        }

    var enableTelemetry: Boolean
        get() = state.enableTelemetry
        set(value) {
            state.enableTelemetry = value
        }

    var promptedForTelemetry: Boolean
        get() = state.promptedForTelemetry
        set(value) {
            state.promptedForTelemetry = value
        }

    var useNewGenerateUIPreview: Boolean
        get() = state.useNewGenerateUIPreview
        set(value) {
            state.useNewGenerateUIPreview = value
        }

    companion object {
        fun getInstance(): NxConsoleSettingsProvider {
            return service()
        }
    }
}

data class NxConsoleSettingsState(
    var enableDryRunOnGenerateChange: Boolean = true,
    var enableTelemetry: Boolean = false,
    var promptedForTelemetry: Boolean = false,
    var useNewGenerateUIPreview: Boolean = false
)
