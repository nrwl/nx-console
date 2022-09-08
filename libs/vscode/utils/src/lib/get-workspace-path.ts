import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';

export function getWorkspacePath() {
  return WorkspaceConfigurationStore.instance.get('nxWorkspacePath', '');
}
