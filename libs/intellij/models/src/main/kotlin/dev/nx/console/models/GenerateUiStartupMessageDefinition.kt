package dev.nx.console.models

import kotlinx.serialization.Serializable

@Serializable
data class GenerateUiStartupMessageDefinition(val message: String, val type: String) {
    init {
        require(type == "warning" || type == "error")
    }
}
