package dev.nx.console.project_details.browsers

import ru.nsk.kstatemachine.state.*


//
// fun getBrowserStateMachine(): StateMachine {
//    lateinit var loadingState: State
//    lateinit var showingPDVState: DataState<LoadSuccessData>
//    lateinit var showingErrorState: DataState<String>
//
//    return createStdLibStateMachine {
//        loadingState = initialState(States.Loading)
//        showingPDVState = dataState(States.ShowingPDV)
//        showingErrorState = dataState(States.ShowingError)
//
//        addInitialState(loadingState) {
//            dataTransition<Events.LoadSuccess, LoadSuccessData> { targetState = showingPDVState }
//            dataTransition<Events.LoadError, String> { targetState = showingErrorState }
//        }
//        addState(showingPDVState) {
//            dataTransition<Events.LoadSuccess, LoadSuccessData> { targetState = showingPDVState }
//            dataTransition<Events.LoadError, String> { targetState = showingErrorState }
//        }
//        addState(showingErrorState) {
//            dataTransition<Events.LoadSuccess, LoadSuccessData> { targetState = showingPDVState }
//            dataTransition<Events.LoadError, String> { targetState = showingErrorState }
//        }
//    }
// }
