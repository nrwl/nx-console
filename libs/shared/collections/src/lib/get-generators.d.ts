import { CollectionInfo, WorkspaceProjects } from '@nx-console/shared/schema';
export declare type GetGeneratorsOptions = {
    includeHidden: boolean;
    includeNgAdd: boolean;
};
export declare function getGenerators(workspacePath: string, projects?: WorkspaceProjects, options?: GetGeneratorsOptions): Promise<CollectionInfo[]>;
