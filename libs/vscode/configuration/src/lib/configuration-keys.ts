export const GLOBAL_CONFIG_KEYS = [
  'commonNxCommands',
  'enableGenerateFromContextMenu',
  'enableCodeLens',
  'enableLibraryImports',
  'enableGeneratorFilters',
  'generatorAllowlist',
  'generatorBlocklist',
  'enableTaskExecutionDryRunOnChange',
  'projectViewingStyle',
  'moveGeneratorPatterns',
  'useNewGenerateUiPreview',
  'showProjectDetailsView',
  'showNodeVersionOnStartup',
  'nxWorkspacePath',
] as const;

export type GlobalConfig = {
  commonNxCommands: string[];
  enableGenerateFromContextMenu: boolean;
  enableCodeLens: boolean;
  enableLibraryImports: boolean;
  enableGeneratorFilters: boolean;
  generatorAllowlist: string[];
  generatorBlocklist: string[];
  enableTaskExecutionDryRunOnChange: boolean;
  projectViewingStyle: 'list' | 'tree' | 'automatic';
  moveGeneratorPatterns: Record<string, string>;
  useNewGenerateUiPreview: boolean;
  showProjectDetailsView: boolean;
  showNodeVersionOnStartup: boolean;
  nxWorkspacePath: string;
};

/**
 * configuration Keys used for NxConsole
 */
export type GlobalConfigKeys = typeof GLOBAL_CONFIG_KEYS[number];

export const WORKSPACE_CONFIG_KEYS = [
  'nxWorkspacePath',
  'nxConversionDate',
  'projectsViewCollapsibleState',
] as const;
/**
 * configuration Keys used for NxConsole on a vscode workspace level
 */
export type WorkspaceConfigKeys = typeof WORKSPACE_CONFIG_KEYS[number];
