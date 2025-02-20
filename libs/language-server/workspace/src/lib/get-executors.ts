import { ExecutorCollectionInfo } from '@nx-console/shared-schema';
import { readCollections } from './read-collections';

export type GetExecutorsOptions = {
  includeHidden: boolean;
  clearPackageJsonCache: boolean;
};

export async function getExecutors(
  workspacePath: string,
  options: GetExecutorsOptions = {
    includeHidden: false,
    clearPackageJsonCache: false,
  }
): Promise<ExecutorCollectionInfo[]> {
  return (
    await readCollections(workspacePath, {
      clearPackageJsonCache: options.clearPackageJsonCache,
      includeHidden: options.includeHidden,
    })
  ).filter(
    (collection): collection is ExecutorCollectionInfo =>
      collection.type === 'executor'
  );
}
