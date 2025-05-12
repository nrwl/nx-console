import { commands, env } from 'vscode';
import { isInCursor } from './editor-name-helpers';

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
    commands.executeCommand('workbench.action.chat.open', {
      mode: 'agent',
      query: message,
      isPartialQuery: newChat ? true : false,
    });
    if (newChat) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await commands.executeCommand('workbench.action.chat.sendToNewChat');
    }
  }
}
