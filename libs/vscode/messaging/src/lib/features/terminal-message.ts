import { commands } from 'vscode';
import { NotificationType } from 'vscode-jsonrpc/node';
import { MessagingNotification } from '../messaging-notification';
import { sendMessageToAgent } from '@nx-console/vscode-utils';

export const NxTerminalMessage: MessagingNotification<string> = {
  type: new NotificationType('nx/terminalMessage'),
  handler: (msg) => {
    console.log('Terminal message received:', msg);
    const query = `
    Can you help with the following terminal output?
    \`\`\`${msg}\`\`\`
    `;

    sendMessageToAgent(query);

   
  },
};
