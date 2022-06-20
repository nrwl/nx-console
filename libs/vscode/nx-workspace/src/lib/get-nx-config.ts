import { cacheJson, readAndCacheJsonFile } from '@nx-console/server';
import type { NxJsonConfiguration } from '@nrwl/devkit';
import { join } from 'path';
import { getNxWorkspacePackageFileUtils } from './get-nx-workspace-package';
import { stat } from 'fs/promises';

export async function getNxConfig(
  baseDir: string
): Promise<NxJsonConfiguration> {
  try {
    // check if the nx.json file exists before reading it
    await stat(join(baseDir, 'nx.json'));
  } catch (e) {
    return {
      // If the file didn't exist, we just have ng as the default because we're in an angular project
      npmScope: '@ng',
    };
  }

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
