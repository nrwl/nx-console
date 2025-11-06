export const GLOBAL_CONFIG_KEYS = [
  'commonNxCommands',
  'enableCodeLens',
  'enableLibraryImports',
  'generatorAllowlist',
  'generatorBlocklist',
  'enableTaskExecutionDryRunOnChange',
  'projectViewingStyle',
  'moveGeneratorPatterns',
  'useNewGenerateUiPreview',
  'showNodeVersionOnStartup',
  'nxWorkspacePath',
  'nxCloudNotifications',
  'enableDebugLogging',
  'mcpPort',
] as const;

export type GlobalConfig = {
  commonNxCommands: string[];
  enableCodeLens: boolean;
  enableLibraryImports: boolean;
  generatorAllowlist: string[];
  generatorBlocklist: string[];
  enableTaskExecutionDryRunOnChange: boolean;
  projectViewingStyle: 'list' | 'tree' | 'automatic';
  moveGeneratorPatterns: Record<string, string>;
  useNewGenerateUiPreview: boolean;
  showNodeVersionOnStartup: boolean;
  nxWorkspacePath: string;
  nxCloudNotifications: 'all' | 'errors' | 'none';
  enableDebugLogging: boolean;
  mcpPort: number | undefined;
};

/**
 * configuration Keys used for NxConsole
 */
export type GlobalConfigKeys = (typeof GLOBAL_CONFIG_KEYS)[number];

export const WORKSPACE_CONFIG_KEYS = [
  'nxWorkspacePath',
  'nxConversionDate',
  'projectsViewCollapsibleState',
  'mcpDontAskAgain',
  'aiCheckDontAskAgain',
  'lastAiCheckNotificationTimestamp',
  'lastAiConfigureNotificationTimestamp',
] as const;
/**
 * configuration Keys used for NxConsole on a vscode workspace level
 */
export type WorkspaceConfigKeys = (typeof WORKSPACE_CONFIG_KEYS)[number];
