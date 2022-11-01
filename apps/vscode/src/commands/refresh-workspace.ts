import { NxWorkspaceRefreshNotification } from '@nx-console/language-server/types';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { sendNotification } from '@nx-console/vscode/lsp-client';
import { getWorkspacePath, outputLogger } from '@nx-console/vscode/utils';
import { debounceTime, Subject } from 'rxjs';
import { commands, window } from 'vscode';

export const REFRESH_WORKSPACE = 'nxConsole.refreshWorkspace';

const refresh = new Subject();

refresh.pipe(debounceTime(150)).subscribe(async () => {
  const { nxWorkspace } = await import('@nx-console/shared/workspace');
  const { daemonEnabled, workspaceType } = await nxWorkspace(
    getWorkspacePath(),
    outputLogger,
    true
  );

  const showNxDaemonWarning = WorkspaceConfigurationStore.instance.get(
    'nxShowNxDaemonWarning',
    true
  );

  if (showNxDaemonWarning && !daemonEnabled && workspaceType === 'nx') {
    window
      .showInformationMessage(
        'It looks like the Nx daemon is not enabled. To reenable it, please run `nx reset` in your terminal.',
        'OK',
        "Don't show again"
      )
      .then((value) => {
        if (value === "Don't show again") {
          WorkspaceConfigurationStore.instance.set(
            'nxShowNxDaemonWarning',
            false
          );
        }
      });
  }
  sendNotification(NxWorkspaceRefreshNotification);
  commands.executeCommand('nxConsole.refreshNxProjectsTree');
  commands.executeCommand('nxConsole.refreshRunTargetTree');
  commands.executeCommand('nx.graph.refresh');
});

/**
 * Refresh workspace by debouncing multiple calls to only trigger once
 */
export function refreshWorkspace() {
  return commands.registerCommand(REFRESH_WORKSPACE, () => {
    refresh.next(undefined);
  });
}
