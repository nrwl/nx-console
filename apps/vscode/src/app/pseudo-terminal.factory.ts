import { PseudoTerminalFactory } from '@angular-console/server';
import { ExtensionContext, window } from 'vscode';

const AC_SUCCESS = 'Process completed 🙏';
const AC_FAILURE = 'Process failed 🐳';

export function getPseudoTerminalFactory(
  context: ExtensionContext
): PseudoTerminalFactory {
  return ({ name, command, args, cwd }) => {
    const terminal = window.createTerminal(name);
    context.subscriptions.push(terminal);

    const humanReadableCommand = `${command} ${args.join(' ')}`;
    const fullCommand =
      `cd ${cwd} &&` +
      `${humanReadableCommand} && echo "\n${AC_SUCCESS}"` +
      ` || echo "\n${AC_FAILURE}"`;

    terminal.sendText(fullCommand);

    let onDidWriteData: ((data: string) => void) | undefined;
    let onExit: ((code: number) => void) | undefined;
    let whaleSpotted = false;

    const disposeTerminal = (code: number) => {
      onDidWriteData = undefined;
      if (onExit) {
        onExit(code);
        onExit = undefined;
      }
      terminal.dispose();
    };

    context.subscriptions.push(
      (<any>terminal).onDidWriteData((data: string) => {
        // Skip printing fullCommand to the pseudo terminal since parts of the
        // command are for internal use only. The last printed character of
        // fullCommand is 🐳.so we watch for the first whale sighting before
        // calling onDidWriteData.
        if (!whaleSpotted) {
          if (data.includes('🐳')) {
            whaleSpotted = true;
            if (onDidWriteData) {
              onDidWriteData(`${humanReadableCommand}\n\r`);
            }
          }
          return;
        }

        if (onDidWriteData) {
          onDidWriteData(data);
        }

        // Screen scrape for AC_SUCCESS or AC_FAILURE as the signal that the
        // process has exited.
        const success = data.includes(AC_SUCCESS);
        const failed = data.includes(AC_FAILURE);
        if (success || failed) {
          disposeTerminal(success ? 0 : 1);
        }
      })
    );

    context.subscriptions.push(
      window.onDidCloseTerminal(t => {
        if (t.processId === terminal.processId) {
          disposeTerminal(1);
        }
      })
    );

    return {
      onDidWriteData: callback => {
        onDidWriteData = callback;
      },
      onExit: callback => {
        onExit = callback;
      },
      kill: () => {
        disposeTerminal(1);
      }
    };
  };
}
