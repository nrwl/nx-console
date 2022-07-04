import { debounceTime, Subject } from 'rxjs';
import { commands } from 'vscode';

export const REFRESH_WORKSPACE = 'nxConsole.refreshWorkspace';

const refresh = new Subject();

refresh.pipe(debounceTime(300)).subscribe(async () => {
  const { nxWorkspace } = await import('@nx-console/vscode/nx-workspace');
  await nxWorkspace(true);
  commands.executeCommand('nxConsole.refreshNxProjectsTree');
  commands.executeCommand('nxConsole.refreshRunTargetTree');
});

/**
 * Refresh workspace by debouncing multiple calls to only trigger once
 */
export function refreshWorkspace() {
  return commands.registerCommand(REFRESH_WORKSPACE, () => {
    refresh.next(undefined);
  });
}
