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
    if (!cachedWorkspaceJson || hasNxProject(cachedWorkspaceJson)) {
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

/**
 * There are points in time where the async nature of the nx-workspace package is still in being resolved.
 * This function will check if the projects are strings
 * @param cachedWorkspaceJson
 * @returns
 */
function hasNxProject(
  cachedWorkspaceJson?: WorkspaceJsonConfiguration
): boolean {
  const projects = cachedWorkspaceJson?.projects ?? {};
  return Object.entries(projects).some(
    ([, project]) => typeof project === 'string'
  );
}
