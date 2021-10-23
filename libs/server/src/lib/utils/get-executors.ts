import { CollectionInfo } from '@nx-console/schema';
import { readCollectionsFromNodeModules } from './read-collections';

export async function getExecutors(
  workspaceJsonPath: string,
  clearPackageJsonCache: boolean
): Promise<CollectionInfo[]> {
  return (
    await readCollectionsFromNodeModules(
      workspaceJsonPath,
      clearPackageJsonCache
    )
  ).filter((collection) => collection.type === 'executor');
}
