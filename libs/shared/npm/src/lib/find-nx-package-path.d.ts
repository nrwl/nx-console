/**
 * Finds the local Nx package in the workspace.
 *
 * It will try to look for the `nx` package, with the specific file. If it does not exist, it will try to look for the `@nrwl/workspace` package, with the specific file
 * @param workspacePath
 * @returns
 */
export declare function findNxPackagePath(workspacePath: string, filePath: string): Promise<string | undefined>;
