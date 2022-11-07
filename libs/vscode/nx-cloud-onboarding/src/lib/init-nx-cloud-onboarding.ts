import { nxWorkspace } from '@nx-console/shared/workspace';
import { getWorkspacePath, watchFile } from '@nx-console/vscode/utils';
import { commands, ExtensionContext } from 'vscode';
import { claimNxCloudWorkspace } from './claim-nx-cloud-workspace';
import { runFirstCommand, viewFirstRunDetails } from './run-first-command';

// TODO: consistent naming: commands prefixed with cloud and always use 'cloud' or 'nxCloud' not both
// TODO: MAYBE DONT HARDCODE ENV VARS
export function initNxCloudOnboarding(context: ExtensionContext): void {
  watchForIsConnectedToCloud();
  commands.executeCommand('setContext', 'isCloudWorkspaceClaimed', false);

  // commands.registerCommand('nxConsole.openCloudWalkthrough', () => {
  //   commands.executeCommand(
  //     `workbench.action.openWalkthrough`,
  //     `nrwl.angular-console#nxCloud`,
  //     false
  //   );
  // });
  commands.registerCommand(
    `nxConsole.claimCloudWorkspace`,
    claimNxCloudWorkspace
  );
  commands.registerCommand('nxConsole.runFirstNxCommand', () => {
    runFirstCommand();
  });
  commands.registerCommand('nxConsole.viewFirstRunDetails', () => {
    viewFirstRunDetails();
  });
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
