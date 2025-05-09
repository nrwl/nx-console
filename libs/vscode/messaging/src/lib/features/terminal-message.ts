import { commands } from 'vscode';
import { NotificationType } from 'vscode-jsonrpc/node';
import { MessagingNotification } from '../messaging-notification';

export const NxTerminalMessage: MessagingNotification<string> = {
  type: new NotificationType('nx/terminalMessage'),
  handler: (msg) => {
    console.log('Terminal message received:', msg);
    const query = `
    Can you help with the following terminal output?
    \`\`\`${msg}\`\`\`
    `;
    commands.executeCommand('workbench.action.chat.open', {
      mode: 'agent',
      query,
      isPartialQuery: false,
    });
  },
};
