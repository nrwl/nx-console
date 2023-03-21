package dev.nx.console.graph

import dev.nx.console.models.ProjectGraphOutput

sealed class NxGraphStates {
    object Init : NxGraphStates() {}
    object Loading : NxGraphStates() {}
    data class Loaded(val graphOutput: ProjectGraphOutput, val reload: Boolean = false) :
        NxGraphStates() {}
    data class Error(val message: String) : NxGraphStates() {}
}
