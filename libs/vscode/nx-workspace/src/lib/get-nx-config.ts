import { cacheJson, readAndCacheJsonFile } from '@nx-console/server';
import { NxJsonConfiguration } from '@nrwl/devkit';
import { join } from 'path';
import { getNxWorkspacePackageFileUtils } from './get-nx-workspace-package';

export async function getNxConfig(
  baseDir: string
): Promise<NxJsonConfiguration> {
  try {
    let cachedNxJson = cacheJson('nx.json', baseDir).json;

    if (!cachedNxJson) {
      const nxJson = (await getNxWorkspacePackageFileUtils()).readNxJson(
        join(baseDir, 'nx.json')
      );

      cachedNxJson = cacheJson('nx.json', baseDir, nxJson).json;
    }
    return cachedNxJson;
  } catch (e) {
    return (await readAndCacheJsonFile('nx.json', baseDir)).json;
  }
}
