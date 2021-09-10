import { readAndCacheJsonFile, cacheJson } from '@nx-console/server';
import { getNxWorkspacePackageFileUtils } from './get-nx-workspace-package';
import type { WorkspaceJsonConfiguration } from '@nrwl/devkit';

export async function getNxWorkspaceConfig(
  basedir: string,
  workspaceJsonPath: string
): Promise<WorkspaceJsonConfiguration> {
  // try and use the workspace version of nx
  try {
    let cachedWorkspaceJson = cacheJson(workspaceJsonPath).json;
    if (!cachedWorkspaceJson) {
      const workspace = (
        await getNxWorkspacePackageFileUtils()
      ).readWorkspaceConfig({
        format: 'nx',
        path: basedir,
      });
      cachedWorkspaceJson = cacheJson(workspaceJsonPath, '', workspace).json;
    }
    return cachedWorkspaceJson;
  } catch (e) {
    return readAndCacheJsonFile(workspaceJsonPath).json;
  }
}
