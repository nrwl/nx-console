import type { WorkspaceJsonConfiguration } from '@nrwl/devkit';
import { fileExists, readAndParseJson } from '@nx-console/server';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { join } from 'path';

/**
 * Get the raw workspace file that hasn't been normalized by nx
 *
 * This is only used for certain operations that need the raw workspace file.
 * This shouldn't be used unless absolutely necessary.
 *
 * @deprecated
 */
export async function getRawWorkspace() {
  const workspacePath = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );
  const workspaceJsonPath = join(workspacePath, 'workspace.json');

  if (await fileExists(workspaceJsonPath)) {
    const rawWorkspace = (await readAndParseJson(
      workspacePath
    )) as WorkspaceJsonConfiguration;
    return { rawWorkspace, workspaceJsonPath };
  }
}
