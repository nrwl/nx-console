package dev.nx.console.nx_toolwindow

import dev.nx.console.models.NxWorkspace
import dev.nx.console.nx_toolwindow.tree.NxTreeStructure
import java.awt.event.ActionListener
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JScrollPane
import ru.nsk.kstatemachine.event.DataEvent
import ru.nsk.kstatemachine.event.Event
import ru.nsk.kstatemachine.state.*

object States {
    const val MainContent = "MainContent"
    const val NxCloud = "NxCloud"
    const val Refresh = "Refresh"
}

object MainContentStates {
    const val InitialLoading = "InitialLoading"
    const val NoNodeInterpreter = "NoNodeInterpreter"
    const val ShowErrors = "ShowErrors"
    const val ShowNoProject = "ShowNoProject"
    const val ShowNoNxWorkspace = "ShowNoNxWorkspace"
    const val ShowProjectTree = "ShowProjectTree"
}

object NxCloudStates {
    const val InitializeNxCloud = "InitializeNxCloud"
    const val ShowConnectedNxCloudPanel = "ShowConnectedNxCloudPanel"
    const val ShowConnectNxCloudPanel = "ShowConnectNxCloudPanel"
}

object RefreshStates {
    const val Refreshing = "Refresthing"
    const val Refreshed = "Refreshed"
}

sealed interface MainContentEvents : Event {
    class ShowNoNodeInterpreter : MainContentEvents
    class ShowErrors(override val data: Int) : DataEvent<Int>, MainContentEvents
    class ShowNoProject : MainContentEvents
    class ShowNoNxWorkspace : MainContentEvents
    class ShowProjectTree(override val data: NxWorkspace) :
        DataEvent<NxWorkspace>, MainContentEvents
}

sealed interface NxCloudEvents : Event {
    class ShowConnectToNxCloud : NxCloudEvents
    class ShowOpenNxCloud(override val data: String) : DataEvent<String>, NxCloudEvents
}

sealed interface RefreshEvents : Event {
    class Refreshing : RefreshEvents
    class Refreshed : RefreshEvents
}

fun createRefreshStateGroup(
    refreshedState: DefaultState,
    refreshingState: DefaultState,
) {
    refreshedState { transition<RefreshEvents.Refreshing> { targetState = refreshingState } }
    refreshingState { transition<RefreshEvents.Refreshed> { targetState = refreshedState } }
}

class MutableRef<T>(var value: T)

fun createMainContentStateGroup(
    noNodeInterpreter: DefaultState,
    showError: DataState<Int>,
    showNoProject: DefaultState,
    showNoNxWorkspace: DefaultState,
    showProjectTree: DataState<NxWorkspace>,
    initialState: DefaultState,
    mainContent: MutableRef<JComponent?>,
    nxToolMainComponents: NxToolMainComponents,
    errorCountAndComponent: MutableRef<Pair<Int, JComponent>?>,
    projectTreeComponent: JScrollPane,
    projectStructure: NxTreeStructure
) {
    noNodeInterpreter {
        onEntry { mainContent.value = nxToolMainComponents.createNoNodeInterpreterComponent() }
    }

    showError {
        onEntry {
            val errorCount = data
            mainContent.value =
                errorCountAndComponent.let { components ->
                    if (components.value == null || components.value?.first != errorCount) {
                        val newPair =
                            Pair(errorCount, nxToolMainComponents.createErrorComponent(errorCount))
                        errorCountAndComponent.value = newPair
                        newPair.second
                    } else {
                        components.value?.second
                    }
                }
        }
    }

    showNoProject {
        onEntry { mainContent.value = nxToolMainComponents.createNoProjectsComponent() }
    }

    showNoNxWorkspace {
        onEntry { mainContent.value = nxToolMainComponents.createNoNxWorkspacePanel() }
    }

    showProjectTree {
        onEntry {
            mainContent.value = projectTreeComponent
            projectStructure.updateNxProjects(data)
        }
    }

    initialState {
        onEntry { mainContent.value = nxToolMainComponents.createSpinnerPanel() }

        transition<MainContentEvents.ShowNoNodeInterpreter> { targetState = noNodeInterpreter }
        transition<MainContentEvents.ShowNoProject> { targetState = showNoProject }
        transition<MainContentEvents.ShowNoNxWorkspace> { targetState = showNoNxWorkspace }
        dataTransition<MainContentEvents.ShowErrors, Int> { targetState = showError }
        dataTransition<MainContentEvents.ShowProjectTree, NxWorkspace> {
            targetState = showProjectTree
        }
    }
}

fun createNxCloudStateGroup(
    showConnectedNxCloudPanel: DataState<String>,
    showConnectNxCloudPanel: DefaultState,
    openNxCloudPanel: MutableRef<JPanel?>,
    connectToNxCloudPanel: MutableRef<JPanel?>,
    nxToolMainComponents: NxToolMainComponents,
    nxConnectActionListener: ActionListener
) {
    showConnectedNxCloudPanel {
        onEntry {
            openNxCloudPanel.value?.let { panel -> panel.isVisible = true }
                ?: run {
                    openNxCloudPanel.value =
                        nxToolMainComponents.createConnectedToNxCloudPanel(data)
                }
            connectToNxCloudPanel.value?.let { panel -> panel.isVisible = false }
        }
    }
    showConnectNxCloudPanel {
        onEntry {
            connectToNxCloudPanel.value?.let { panel -> panel.isVisible = true }
                ?: run {
                    connectToNxCloudPanel.value =
                        nxToolMainComponents.createConnectToNxCloudPanel(nxConnectActionListener)
                }
            openNxCloudPanel.value?.let { panel -> panel.isVisible = false }
        }
    }

    showConnectedNxCloudPanel {
        transition<NxCloudEvents.ShowConnectToNxCloud> { targetState = showConnectNxCloudPanel }
    }

    showConnectNxCloudPanel {
        dataTransition<NxCloudEvents.ShowOpenNxCloud, String> {
            targetState = showConnectedNxCloudPanel
        }
    }
}
