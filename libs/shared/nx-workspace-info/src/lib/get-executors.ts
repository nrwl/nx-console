import { ExecutorCollectionInfo } from '@nx-console/shared-schema';
import { readCollections } from './read-collections';
import { Logger } from '@nx-console/shared-utils';

export type GetExecutorsOptions = {
  includeHidden: boolean;
};

export async function getExecutors(
  workspacePath: string,
  options: GetExecutorsOptions = {
    includeHidden: false,
  },
  logger?: Logger,
): Promise<ExecutorCollectionInfo[]> {
  return (
    await readCollections(
      workspacePath,
      {
        includeHidden: options.includeHidden,
      },
      logger,
    )
  ).filter(
    (collection): collection is ExecutorCollectionInfo =>
      collection.type === 'executor',
  );
}
