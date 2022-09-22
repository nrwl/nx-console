export declare function isWorkspaceInPnp(workspacePath: string): Promise<boolean>;
export declare function pnpDependencies(workspacePath: string): Promise<string[]>;
export declare function pnpDependencyPath(workspacePath: string, dependencyName: string): Promise<string | undefined>;
