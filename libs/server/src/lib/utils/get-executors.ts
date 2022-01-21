import { CollectionInfo } from '@nx-console/schema';
import { readCollections } from './read-collections';

export async function getExecutors(
  workspacePath: string,
  clearPackageJsonCache: boolean
): Promise<CollectionInfo[]> {
  return (await readCollections(workspacePath, clearPackageJsonCache)).filter(
    (collection) => collection.type === 'executor'
  );
}
