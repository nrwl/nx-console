import { WorkspaceConfigurationStore } from '@nx-console/vscode-configuration';
import { commands, ExtensionContext, window } from 'vscode';

let run = false;

export async function initNxConversion(
  context: ExtensionContext,
  isAngularWorkspace: boolean,
  isNxWorkspace: boolean
) {
  let workspaceType: 'nx' | 'angular' | 'angularWithNx' = 'nx';
  if (isNxWorkspace && isAngularWorkspace) {
    workspaceType = 'angularWithNx';
  } else if (isNxWorkspace && !isAngularWorkspace) {
    workspaceType = 'nx';
  } else if (!isNxWorkspace && isAngularWorkspace) {
    workspaceType = 'angular';
  }

  if (workspaceType !== 'angular') {
    return;
  }

  if (run) {
    return;
  }
  run = true;
  const now = new Date();
  const lastConversionNotficationTime =
    WorkspaceConfigurationStore.instance.get('nxConversionDate', 0);

  const command = commands.registerCommand(
    'nxConsole.migrateAngularCliToNx',
    () => {
      commands.executeCommand('nx.init', true);
    }
  );
  context.subscriptions.push(command);

  if (now.getDay() === new Date(lastConversionNotficationTime).getDay()) {
    return;
  }

  WorkspaceConfigurationStore.instance.set('nxConversionDate', now.getTime());
  const answer = await window.showInformationMessage(
    `Want to migrate? Migrate your Angular workspace to Nx and get features like remote caching, distributed builds, and atomized tests out of the box.`,
    'Migrate Now',
    'Learn More'
  );
  if (answer === 'Migrate Now') {
    commands.executeCommand('nxConsole.migrateAngularCliToNx');
    return;
  }
  if (answer === 'Learn More') {
    commands.executeCommand(
      'vscode.open',
      'https://nx.dev/recipes/adopting-nx/migration-angular'
    );
    return;
  }
}
