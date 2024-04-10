package dev.nx.console.settings

import com.intellij.openapi.components.*
import com.intellij.openapi.project.Project
import dev.nx.console.settings.options.GeneratorFilter
import dev.nx.console.settings.options.ToolWindowStyles

@Service(Service.Level.PROJECT)
@State(name = "NxConsoleProjectSettingsProvider", storages = [Storage("nx-console.xml")])
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
        get() = state.generatorAllowlist?.entries?.map { GeneratorFilter(it.key, it.value) }
        set(value) {
            state.generatorAllowlist = value?.associateBy({ it.matcher }, { it.include })
        }

    var toolwindowStyle: ToolWindowStyles
        get() = state.toolwindowStyle
        set(value) {
            state.toolwindowStyle = value
        }

    companion object {
        fun getInstance(project: Project): NxConsoleProjectSettingsProvider {
            return project.getService(NxConsoleProjectSettingsProvider::class.java)
        }
    }
}

data class NxConsoleProjectSettingsState(
    var workspacePath: String? = null,
    var generatorAllowlist: Map<String, Boolean>? = null,
    var toolwindowStyle: ToolWindowStyles = ToolWindowStyles.AUTOMATIC
) {}
