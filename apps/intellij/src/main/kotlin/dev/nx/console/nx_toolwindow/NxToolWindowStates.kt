package dev.nx.console.nx_toolwindow

import com.intellij.openapi.application.EDT
import dev.nx.console.models.NxWorkspace
import javax.swing.JProgressBar
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
    class ShowNotConnectedToNxCloud : NxCloudEvents

    class ShowConnectedToNxCloud(override val data: String) : DataEvent<String>, NxCloudEvents

    class Hide : NxCloudEvents
}

sealed interface RefreshEvents : Event {
    class Refreshing : RefreshEvents

    class Refreshed : RefreshEvents
}

fun createRefreshStateGroup(
    refreshedState: DefaultState,
    refreshingState: DefaultState,
    progressBar: JProgressBar,
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
