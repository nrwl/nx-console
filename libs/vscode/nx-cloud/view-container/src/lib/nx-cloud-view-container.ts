import { nxWorkspace } from '@nx-console/shared/workspace';
import { NxCloudRunsProvider } from '@nx-console/vscode/nx-cloud/cloud-runs-view';
import { getWorkspacePath, watchFile } from '@nx-console/vscode/utils';
import { commands, ExtensionContext, window } from 'vscode';

export function initNxCloudViewContainer(context: ExtensionContext) {
  watchForIsConnectedToCloud();

  const nxCloudRunsTreeView = window.createTreeView('nxCloudRuns', {
    treeDataProvider: new NxCloudRunsProvider(),
  });

  context.subscriptions.push(nxCloudRunsTreeView);
}

function watchForIsConnectedToCloud() {
  isConnectedToCloud().then((c) => {
    commands.executeCommand('setContext', 'isConnectedToCloud', c);
  });

  watchFile(`${getWorkspacePath()}/nx.json`, async () => {
    const isConnected = await isConnectedToCloud();
    commands.executeCommand('setContext', 'isConnectedToCloud', isConnected);
  });
}

async function isConnectedToCloud(): Promise<boolean> {
  const nxConfig = (await nxWorkspace(getWorkspacePath(), undefined, true))
    .workspace;
  if (!nxConfig.tasksRunnerOptions) {
    return false;
  }
  return !!Object.values(nxConfig.tasksRunnerOptions).find(
    (r) => r.runner == '@nrwl/nx-cloud'
  );
}
