import { CollectionInfo, WorkspaceProjects } from '@nx-console/shared/schema';
export declare type GetExecutorsOptions = {
    includeHidden: boolean;
};
export declare function getExecutors(workspacePath: string, projects: WorkspaceProjects, clearPackageJsonCache: boolean, options?: {
    includeHidden: boolean;
}): Promise<CollectionInfo[]>;
