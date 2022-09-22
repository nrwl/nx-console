/**
 * Get a flat list of all node_modules folders in the workspace.
 * This is needed to continue to support Angular CLI projects.
 *
 * @param workspacePath
 * @returns
 */
export declare function npmDependencies(workspacePath: string): Promise<string[]>;
