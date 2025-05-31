import { commands, env, window } from 'vscode';
import { isInCursor } from './editor-name-helpers';
import { vscodeLogger } from './logger';

export async function sendMessageToAgent(message: string, newChat = true) {
  if (isInCursor()) {
    if (newChat) {
      commands.executeCommand('composer.newAgentChat');
    } else {
      commands.executeCommand('composerMode.agent');
    }
    await new Promise((resolve) => setTimeout(resolve, 150));

    const originalClipboard = await env.clipboard.readText();
    await env.clipboard.writeText(message);
    await commands.executeCommand('editor.action.clipboardPasteAction');
    await env.clipboard.writeText(originalClipboard);
  } else {
    try {
      if (newChat) {
        commands.executeCommand('workbench.action.chat.newChat', {
          agentMode: true,
          inputValue: message,
          isPartialQuery: false,
        });
      } else {
        commands.executeCommand('workbench.action.chat.open', {
          mode: 'agent',
          query: message,
        });
      }
    } catch (error) {
      vscodeLogger.log('Error sending message to agent:', error);
      window.showErrorMessage(
        'Please update VSCode to the latest version to send messages to the agent.',
      );
    }
  }
}
