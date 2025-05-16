import { join } from 'path';
import {
  fileExists,
  readAndCacheJsonFile,
} from '@nx-console/shared-file-system';
import { coerce } from 'semver';
import { workspaceDependencyPath } from './workspace-dependencies';

export async function checkIsNxWorkspace(
  workspacePath: string,
  supportLerna = true,
): Promise<boolean> {
  let isNxWorkspace = await fileExists(join(workspacePath, 'nx.json'));

  if (!isNxWorkspace && supportLerna) {
    const lernaPath = await workspaceDependencyPath(workspacePath, 'lerna');
    if (!lernaPath) {
      return false;
    }

    const lernaPackageJson = await readAndCacheJsonFile(
      join(lernaPath, 'package.json'),
    );
    const lernaVersion = coerce(lernaPackageJson.json.version);

    if (lernaVersion?.major ?? 0 >= 6) {
      isNxWorkspace = true;
    } else {
      const lerna = await readAndCacheJsonFile('lerna.json', workspacePath);
      isNxWorkspace = lerna.json.useNx ?? false;
    }
  }

  return isNxWorkspace;
}
