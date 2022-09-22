export declare const GLOBAL_CONFIG_KEYS: readonly ["enableTelemetry", "enableGenerateFromContextMenu", "enableWorkspaceConfigCodeLens", "enableLibraryImports", "enableGeneratorFilters", "generatorAllowlist", "generatorBlocklist"];
/**
 * configuration Keys used for NxConsole
 */
export declare type GlobalConfigKeys = typeof GLOBAL_CONFIG_KEYS[number];
export declare const WORKSPACE_CONFIG_KEYS: readonly ["nxWorkspacePath", "nxConversionCount", "nxConversionDoNotAskAgain", "workspaceType", "nxVersion"];
/**
 * configuration Keys used for NxConsole on a vscode workspace level
 */
export declare type WorkspaceConfigKeys = typeof WORKSPACE_CONFIG_KEYS[number];
