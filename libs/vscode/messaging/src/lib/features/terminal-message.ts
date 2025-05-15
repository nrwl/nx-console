import { NotificationType } from 'vscode-jsonrpc/node';
import { MessagingNotification } from '../messaging-notification';
import { sendMessageToAgent, vscodeLogger } from '@nx-console/vscode-utils';

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
