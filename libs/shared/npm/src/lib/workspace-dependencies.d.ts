import { WorkspaceProjects } from '@nx-console/shared/schema';
/**
 * Get dependencies for the current workspace.
 * This is needed to continue to support Angular CLI projects.
 *
 * @param workspacePath
 * @returns
 */
export declare function workspaceDependencies(workspacePath: string, projects?: WorkspaceProjects): Promise<string[]>;
export declare function workspaceDependencyPath(workspacePath: string, workspaceDependencyName: string): Promise<string | undefined>;
export declare function localDependencyPath(workspacePath: string, workspaceDependencyName: string, projects: WorkspaceProjects): Promise<string | undefined>;
