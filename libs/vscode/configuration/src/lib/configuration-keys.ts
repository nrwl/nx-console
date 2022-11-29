export const GLOBAL_CONFIG_KEYS = [
  'enableTelemetry',
  'commonNxCommands',
  'enableGenerateFromContextMenu',
  'enableWorkspaceConfigCodeLens',
  'enableLibraryImports',
  'enableGeneratorFilters',
  'generatorAllowlist',
  'generatorBlocklist',
  'enableTaskExecutionDryRunOnChange',
  'projectViewingStyle',
] as const;

export type GlobalConfig = {
  enableTelemetry: boolean;
  commonNxCommands: string[];
  enableGenerateFromContextMenu: boolean;
  enableWorkspaceConfigCodeLens: boolean;
  enableLibraryImports: boolean;
  enableGeneratorFilters: boolean;
  generatorAllowlist: string[];
  generatorBlocklist: string[];
  enableTaskExecutionDryRunOnChange: boolean;
  projectViewingStyle: 'list' | 'tree';
};

/**
 * configuration Keys used for NxConsole
 */
export type GlobalConfigKeys = typeof GLOBAL_CONFIG_KEYS[number];

export const WORKSPACE_CONFIG_KEYS = [
  'nxWorkspacePath',
  'nxConversionCount',
  'nxConversionDoNotAskAgain',
  'workspaceType',
  'nxVersion',
  'projectsViewCollapsibleState',
] as const;
/**
 * configuration Keys used for NxConsole on a vscode workspace level
 */
export type WorkspaceConfigKeys = typeof WORKSPACE_CONFIG_KEYS[number];
