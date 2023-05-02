package dev.nx.console.settings

import com.intellij.openapi.components.*
import com.intellij.openapi.project.Project
import dev.nx.console.settings.options.GeneratorFilter

@State(name = "NxConsoleSettingsProvider", storages = [Storage("nx-console.xml")])
class NxConsoleProjectSettingsProvider(val project: Project) :
    PersistentStateComponent<NxConsoleProjectSettingsState> {

    private var state = NxConsoleProjectSettingsState()
    override fun getState(): NxConsoleProjectSettingsState? {
        return state
    }

    override fun loadState(state: NxConsoleProjectSettingsState) {
        this.state = state
    }
    var workspacePath: String?
        get() = state.workspacePath
        set(value) {
            state.workspacePath = value
        }

    var generatorFilters: List<GeneratorFilter>?
        get() = state.generatorAllowlist
        set(value) {
            state.generatorAllowlist = value
        }

    companion object {
        fun getInstance(project: Project): NxConsoleProjectSettingsProvider {
            return project.getService(NxConsoleProjectSettingsProvider::class.java)
        }
    }
}

data class NxConsoleProjectSettingsState(
    var workspacePath: String? = null,
    var generatorAllowlist: List<GeneratorFilter>? = null
) {}
