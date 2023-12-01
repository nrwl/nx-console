import { NxWorkspaceRefreshNotification } from '@nx-console/language-server/types';
import { commands, EventEmitter, ExtensionContext } from 'vscode';
import { sendNotification } from './configure-lsp-client';

export const REFRESH_WORKSPACE = 'nxConsole.refreshWorkspace';

const refreshedEventEmitter = new EventEmitter<void>();

export function handleNxlsRefresh() {
  refreshedEventEmitter.fire();
}

function handleVSCodeRefresh() {
  sendNotification(NxWorkspaceRefreshNotification);
}

export function onWorkspaceRefreshed(callback: () => void) {
  refreshedEventEmitter.event(callback);
}

/**
 * Refresh workspace by debouncing multiple calls to only trigger once
 */
export function initRefreshWorkspace(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(REFRESH_WORKSPACE, () => {
      handleVSCodeRefresh();
    })
  );
}
