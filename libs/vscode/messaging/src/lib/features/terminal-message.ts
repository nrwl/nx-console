import { NotificationType } from 'vscode-jsonrpc/node';
import { MessagingNotification } from '../messaging-notification';
import { sendMessageToAgent } from '@nx-console/vscode-utils';
import { vscodeLogger } from '@nx-console/vscode-output-channels';

export const NxTerminalMessage: MessagingNotification<string> = {
  type: new NotificationType('nx/terminalMessage'),
  handler: (_) => (msg) => {
    vscodeLogger.log('Terminal message received:', msg);
    const query = `
    Can you help with the following terminal output?

    ${msg}
    `;

    sendMessageToAgent(query);
  },
};
