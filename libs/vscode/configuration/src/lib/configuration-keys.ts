export const GLOBAL_CONFIG_KEYS = [
  'enableTelemetry',
  'useNVM',
  'enableGenerateFromContextMenu',
  'enableWorkspaceConfigCodeLens',
  'enableLibraryImports',
] as const;

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
] as const;
/**
 * configuration Keys used for NxConsole on a vscode workspace level
 */
export type WorkspaceConfigKeys = typeof WORKSPACE_CONFIG_KEYS[number];
