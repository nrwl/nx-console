import { commands, ExtensionContext, window } from 'vscode';
export function initTerminal(context: ExtensionContext): void {
  setTimeout(async () => {
    debugger;
    const commandsAvailable = await commands.getCommands();
    console.log(commandsAvailable);
  }, 1000);
  context.subscriptions.push(
    window.onDidStartTerminalShellExecution(async (e) => {
      for await (const data of e.execution.read()) {
        const text = data.trim();
        const regex = /nx::({.*?})/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
          const content = JSON.parse(match[1]);
          commands.executeCommand('workbench.action.chat.open', {
            mode: 'agent',
            query: content.key,
            isPartialQuery: false,
          });
        }
      }
    }),
  );
}
