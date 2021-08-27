import { cacheJson, readAndCacheJsonFile } from '@nx-console/server';
import { NxJsonConfiguration } from '@nrwl/devkit';
import { join } from 'path';
import { getNxWorkspacePackageFileUtils } from './get-nx-workspace-package';

export function getNxConfig(baseDir: string): NxJsonConfiguration {
  try {
    let cachedNxJson = cacheJson('nx.json', baseDir).json;

    if (!cachedNxJson) {
      const nxJson = getNxWorkspacePackageFileUtils().readNxJson(
        join(baseDir, 'nx.json')
      );

      cachedNxJson = cacheJson('nx.json', baseDir, nxJson).json;
    }
    return cachedNxJson;
  } catch (e) {
    return readAndCacheJsonFile('nx.json', baseDir).json;
  }
}
