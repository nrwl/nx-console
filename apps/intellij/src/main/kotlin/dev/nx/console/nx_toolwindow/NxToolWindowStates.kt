package dev.nx.console.nx_toolwindow

import com.intellij.openapi.application.EDT
import dev.nx.console.models.NxWorkspace
import dev.nx.console.nx_toolwindow.cloud_tree.CIPETreeStructure
import dev.nx.console.nx_toolwindow.tree.NxTreeStructure
import java.awt.event.ActionListener
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JProgressBar
import javax.swing.JScrollPane
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
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
    const val Hidden = "Hidden"
    const val ShowConnectedNxCloudPanel = "ShowConnectedNxCloudPanel"
    const val ShowConnectNxCloudPanel = "ShowConnectNxCloudPanel"
}

object RefreshStates {
    const val Refreshing = "Refreshing"
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
    class Hide : NxCloudEvents
}

sealed interface RefreshEvents : Event {
    class Refreshing : RefreshEvents
    class Refreshed : RefreshEvents
}

fun createRefreshStateGroup(
    refreshedState: DefaultState,
    refreshingState: DefaultState,
    progressBar: JProgressBar
) {
    refreshedState {
        onEntry { withContext(Dispatchers.EDT) { progressBar.isIndeterminate = false } }
        transition<RefreshEvents.Refreshing> { targetState = refreshingState }
    }
    refreshingState {
        onEntry { withContext(Dispatchers.EDT) { progressBar.isIndeterminate = true } }
        transition<RefreshEvents.Refreshed> { targetState = refreshedState }
    }
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
        onEntry {
            mainContent.value = null // No explicit spinner component needed
        }
    }

    // Add common transitions to all states
    listOf(
            initialState,
            noNodeInterpreter,
            showError,
            showNoProject,
            showNoNxWorkspace,
            showProjectTree
        )
        .forEach { state ->
            state.apply {
                transition<MainContentEvents.ShowNoNodeInterpreter> {
                    targetState = noNodeInterpreter
                }
                transition<MainContentEvents.ShowNoProject> { targetState = showNoProject }
                transition<MainContentEvents.ShowNoNxWorkspace> { targetState = showNoNxWorkspace }
                dataTransition<MainContentEvents.ShowErrors, Int> { targetState = showError }
                dataTransition<MainContentEvents.ShowProjectTree, NxWorkspace> {
                    targetState = showProjectTree
                }
            }
        }
}

fun createNxCloudStateGroup(
    hidden: DefaultState,
    showConnectedNxCloudPanel: DataState<String>,
    showConnectNxCloudPanel: DefaultState,
    openNxCloudPanel: MutableRef<JPanel?>,
    connectToNxCloudPanel: MutableRef<JPanel?>,
    nxToolMainComponents: NxToolMainComponents,
    nxConnectActionListener: ActionListener,
    cipeTreeStructure: CIPETreeStructure
) {
    hidden {
        onEntry {
            openNxCloudPanel.value?.let { panel -> panel.isVisible = false }
            connectToNxCloudPanel.value?.let { panel -> panel.isVisible = false }
        }
        transition<NxCloudEvents.ShowConnectToNxCloud> { targetState = showConnectNxCloudPanel }
        dataTransition<NxCloudEvents.ShowOpenNxCloud, String> {
            targetState = showConnectedNxCloudPanel
        }
    }

    showConnectedNxCloudPanel {
        onEntry {
            openNxCloudPanel.value?.let { panel -> panel.isVisible = true }
                ?: run {
                    openNxCloudPanel.value =
                        nxToolMainComponents.createConnectedToNxCloudPanel(data, cipeTreeStructure)
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
        transition<NxCloudEvents.Hide> { targetState = hidden }
    }

    showConnectNxCloudPanel {
        dataTransition<NxCloudEvents.ShowOpenNxCloud, String> {
            targetState = showConnectedNxCloudPanel
        }
        transition<NxCloudEvents.Hide> { targetState = hidden }
    }
}
