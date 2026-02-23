package dev.nx.console.models

data class AgentStatusInfo(val name: String, val displayName: String)

data class ConfigureAiAgentsStatus(
    val fullyConfiguredAgents: List<AgentStatusInfo>,
    val outdatedAgents: List<AgentStatusInfo>,
    val partiallyConfiguredAgents: List<AgentStatusInfo>,
    val nonConfiguredAgents: List<AgentStatusInfo>,
)
