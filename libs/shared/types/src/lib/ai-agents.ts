export type AgentStatusInfo = {
  name: string;
  displayName: string;
};

export type ConfigureAiAgentsStatus = {
  fullyConfiguredAgents: AgentStatusInfo[];
  outdatedAgents: AgentStatusInfo[];
  partiallyConfiguredAgents: AgentStatusInfo[];
  nonConfiguredAgents: AgentStatusInfo[];
};
