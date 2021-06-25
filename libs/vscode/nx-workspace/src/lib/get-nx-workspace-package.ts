import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { dirname, join } from 'path';
import type * as NxWorkspacePackage from '@nrwl/workspace';
/**
 * Get the local installed version of @nrwl/workspace
 */
export function getNxWorkspacePackage(): typeof NxWorkspacePackage {
  const workspacePath = dirname(
    WorkspaceConfigurationStore.instance.get('nxWorkspaceJsonPath', '')
  );

  // webpack hacks..
  return eval('require')(
    join(workspacePath, 'node_modules', '@nrwl', 'workspace')
  );
}
