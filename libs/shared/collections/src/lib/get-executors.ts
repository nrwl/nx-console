import { CollectionInfo, WorkspaceProjects } from '@nx-console/shared/schema';
import { readCollections } from './read-collections';

export async function getExecutors(
  workspacePath: string,
  projects: WorkspaceProjects,
  clearPackageJsonCache: boolean
): Promise<CollectionInfo[]> {
  return (
    await readCollections(workspacePath, { projects, clearPackageJsonCache })
  ).filter((collection) => collection.type === 'executor');
}
