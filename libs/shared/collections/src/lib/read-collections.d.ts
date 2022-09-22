import { CollectionInfo, WorkspaceProjects } from '@nx-console/shared/schema';
export declare type ReadCollectionsOptions = {
    projects?: WorkspaceProjects;
    clearPackageJsonCache?: boolean;
    includeHidden?: boolean;
    includeNgAdd?: boolean;
};
export declare function readCollections(workspacePath: string, options: ReadCollectionsOptions): Promise<CollectionInfo[]>;
export declare function getCollectionInfo(workspacePath: string, collectionName: string, collectionPath: string, executorCollection: {
    path: string;
    json: any;
}, generatorCollection: {
    path: string;
    json: any;
}, options: ReadCollectionsOptions): Promise<CollectionInfo[]>;
