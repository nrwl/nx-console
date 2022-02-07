import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { join } from 'path';
import * as NxWorkspaceFileUtils from '@nrwl/workspace/src/core/file-utils';
import { getOutputChannel } from '@nx-console/server';
import { platform } from 'os';
import { workspaceDependencyPath } from '@nx-console/npm';

declare function __non_webpack_require__(importPath: string): any;

/**
 * Get the local installed version of @nrwl/workspace
 */
export async function getNxWorkspacePackageFileUtils(): Promise<
  typeof NxWorkspaceFileUtils
> {
  const workspacePath = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );

  const nrwlWorkspaceDepPath = await workspaceDependencyPath(
    workspacePath,
    '@nrwl/workspace'
  );

  return new Promise((res) => {
    try {
      if (!nrwlWorkspaceDepPath) {
        throw '@nrwl/workspace not found';
      }

      let importPath = join(
        nrwlWorkspaceDepPath,
        'src',
        'core',
        'file-utils.js'
      );

      if (platform() === 'win32') {
        importPath = importPath.replace(/\\/g, '/');
      }
      const imported = __non_webpack_require__(importPath);

      if (!('readWorkspaceConfig' in imported)) {
        throw new Error(
          'Workspace tools does not have `readWorkspaceConfig` function. Use built in @nrwl/workspace package'
        );
      }

      return res(imported);
    } catch (error) {
      getOutputChannel().appendLine(
        `
    Error loading @nrwl/workspace from workspace. Falling back to extension dependency
    ${error}
          `
      );
      return res(NxWorkspaceFileUtils);
    }
  });
}
