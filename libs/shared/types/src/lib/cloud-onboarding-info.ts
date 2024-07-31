export type CloudOnboardingInfo = {
  hasNxInCI: boolean;
  hasAffectedCommandsInCI: boolean;
  isConnectedToCloud: boolean;
  isWorkspaceClaimed: boolean;
  personalAccessToken: string | undefined;
};
