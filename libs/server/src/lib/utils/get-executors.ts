import { CollectionInfo } from '@nx-console/schema';
import { readCollectionsFromNodeModules } from './read-collections';

export async function getExecutors(
  workspacePath: string,
  clearPackageJsonCache: boolean
): Promise<CollectionInfo[]> {
  return (
    await readCollectionsFromNodeModules(workspacePath, clearPackageJsonCache)
  ).filter((collection) => collection.type === 'executor');
}
