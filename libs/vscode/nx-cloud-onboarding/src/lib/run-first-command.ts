import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { selectCliCommandAndPromptForFlags } from '@nx-console/vscode/tasks';
import { commands, env, tasks, Uri, window } from 'vscode';

export async function runFirstCommand() {
  process.env['NX_BRANCH'] = 'testing';
  selectCliCommandAndPromptForFlags('run');
  const disposable = tasks.onDidEndTaskProcess((taskEndEvent) => {
    console.log(taskEndEvent);
    if (taskEndEvent.execution.task.definition.type === 'nx') {
      commands.executeCommand('setContext', 'hasRunFirstCommand', true);
      window.showInformationMessage('debug run');
      process.env['NX_BRANCH'] = undefined;

      disposable.dispose();
    }
  }, undefined);
}

export function viewFirstRunDetails() {
  const orgId = 'myorgid';
  const workspaceId = WorkspaceConfigurationStore.instance.get(
    'nxCoudWorkspaceId',
    ''
  );

  env.openExternal(
    Uri.parse(
      `https://cloud.nx.app/orgs/${orgId}/workspaces/${workspaceId}/runs?withoutBranch=false&status=&branch=testing`
    )
  );
  //   commands.executeCommand('vscode.open', [
  //     Uri.parse(
  //       `https://cloud.nx.app/orgs/${orgId}/workspaces/${workspaceId}/runs?withoutBranch=false&status=&branch=testing`
  //     ),
  //   ]);
}
