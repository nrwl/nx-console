import { join } from 'path';
import {
  fileExists,
  readAndCacheJsonFile,
} from '@nx-console/shared/file-system';

export async function checkIsNxWorkspace(
  workspacePath: string
): Promise<boolean> {
  let isNxWorkspace = await fileExists(join(workspacePath, 'nx.json'));

  if (!isNxWorkspace) {
    const lerna = await readAndCacheJsonFile('lerna.json', workspacePath);
    isNxWorkspace = lerna.json.useNx ?? false;
  }

  return isNxWorkspace;
}
