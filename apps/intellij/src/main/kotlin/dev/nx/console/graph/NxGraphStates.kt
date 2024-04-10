package dev.nx.console.graph

import dev.nx.console.models.ProjectGraphOutput

sealed class NxGraphStates {
    data object Init : NxGraphStates()

    data object Loading : NxGraphStates()

    data class Loaded(val graphOutput: ProjectGraphOutput, val reload: Boolean = false) :
        NxGraphStates() {}

    data class Error(val message: String) : NxGraphStates() {}
}
