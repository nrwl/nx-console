import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { dirname, join } from 'path';
import * as NxWorkspaceFileUtils from '@nrwl/workspace/src/core/file-utils';
import { getOutputChannel } from '@nx-console/server';
import { platform } from 'os';

/**
 * Get the local installed version of @nrwl/workspace
 */
export async function getNxWorkspacePackageFileUtils(): Promise<
  typeof NxWorkspaceFileUtils
> {
  const workspacePath = dirname(
    WorkspaceConfigurationStore.instance.get('nxWorkspaceJsonPath', '')
  );

  const importPath = join(
    workspacePath,
    'node_modules',
    '@nrwl',
    'workspace',
    'src',
    'core',
    'file-utils.js'
  );

  return import(
    /*webpackIgnore: true*/
    platform() === 'win32' ? `file://${importPath}` : importPath
  ).catch(() => {
    getOutputChannel().appendLine(
      `Error loading @nrwl/workspace from workspace. Falling back to extension dependency`
    );
    return NxWorkspaceFileUtils;
  });
}
