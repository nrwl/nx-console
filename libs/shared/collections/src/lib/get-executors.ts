import { CollectionInfo, WorkspaceProjects } from '@nx-console/shared/schema';

import { readCollections } from './read-collections';

export type GetExecutorsOptions = { includeHidden: boolean };
export async function getExecutors(
  workspacePath: string,
  projects: WorkspaceProjects,
  clearPackageJsonCache: boolean,
  options = { includeHidden: false }
): Promise<CollectionInfo[]> {
  return (
    await readCollections(workspacePath, {
      projects,
      clearPackageJsonCache,
      includeHidden: options.includeHidden,
    })
  ).filter((collection) => collection.type === 'executor');
}
