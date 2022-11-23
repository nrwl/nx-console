import { NxWorkspaceRefreshNotification } from '@nx-console/language-server/types';
import { sendNotification } from '@nx-console/vscode/lsp-client';
import { debounceTime, Subject } from 'rxjs';
import { commands } from 'vscode';

export const REFRESH_WORKSPACE = 'nxConsole.refreshWorkspace';

const refresh = new Subject();

refresh.pipe(debounceTime(150)).subscribe(async () => {
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
