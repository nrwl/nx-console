import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { dirname, join } from 'path';
import * as NxWorkspaceFileUtils from '@nrwl/workspace/src/core/file-utils';
import { getOutputChannel } from '@nx-console/server';
import { platform } from 'os';

declare function __non_webpack_require__(importPath: string): any;

/**
 * Get the local installed version of @nrwl/workspace
 */
export async function getNxWorkspacePackageFileUtils(): Promise<
  typeof NxWorkspaceFileUtils
> {
  const workspacePath = dirname(
    WorkspaceConfigurationStore.instance.get('nxWorkspaceJsonPath', '')
  );

  let importPath = join(
    workspacePath,
    'node_modules',
    '@nrwl',
    'workspace',
    'src',
    'core',
    'file-utils.js'
  );

  return new Promise((res) => {
    try {
      if (platform() === 'win32') {
        importPath = importPath.replace(/\\/g, '/');
      }
      const imported = __non_webpack_require__(importPath);
      return res(imported);
    } catch (error) {
      getOutputChannel().appendLine(
        `
    Error loading @nrwl/workspace from workspace. Falling back to extension dependency
    Error: ${error}
          `
      );
      return res(NxWorkspaceFileUtils);
    }
  });
}
