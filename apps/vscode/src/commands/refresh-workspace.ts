import { NxWorkspaceRefreshNotification } from '@nx-console/language-server/types';
import { checkIsNxWorkspace } from '@nx-console/shared/utils';
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
  if (!daemonEnabled && workspaceType === 'nx') {
    window.showErrorMessage(
      'It looks like the Nx daemon is not enabled.\nPlease check your configuration and restart the daemon with `nx reset`.',
      'OK'
    );
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
