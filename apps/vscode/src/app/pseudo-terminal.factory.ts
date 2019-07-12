import {
  PseudoTerminal,
  PseudoTerminalConfig,
  PseudoTerminalFactory
} from '@angular-console/server';
import { platform } from 'os';
import { ExtensionContext, window } from 'vscode';

export function getPseudoTerminalFactory(
  context: ExtensionContext
): PseudoTerminalFactory {
  return config => {
    if (platform() === 'win32') {
      return win32PseudoTerminalFactory(context, config);
    }
    return unixPseudoTerminalFactory(context, config);
  };
}

// TODO: Handle WSL Mode
function win32PseudoTerminalFactory(
  context: ExtensionContext,
  { name, program, args, cwd, displayCommand }: PseudoTerminalConfig
): PseudoTerminal {
  const AC_SUCCESS = 'Process completed #woot';
  const AC_FAILURE = 'Process failed #failwhale';
  const fullCommand = [
    `Try {`,
    `& '${program}' ${args.join(' ')};`,
    `if($?) { echo '${AC_SUCCESS}' };`,
    `if(!$?) { echo '${AC_FAILURE}' };`,
    `} Catch { `,
    `echo 'Process failed #failwhale'`,
    `}`
  ].join(' ');

  console.log('full command', fullCommand);

  const terminal = window.createTerminal({
    name,
    cwd,
    shellPath: 'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    shellArgs: `-Sta -NoLogo -NonInteractive -C "& {${fullCommand}}"`
  });

  context.subscriptions.push(terminal);
  let onDidWriteData: ((data: string) => void) | undefined;
  let onExit: ((code: number) => void) | undefined;

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
      if (onDidWriteData) {
        if (!data.trim()) {
          console.log('empty', data);
          return;
        }
        console.log('writing', data);
        onDidWriteData(data);
      }

      // Screen scrape for AC_SUCCESS or AC_FAILURE as the signal that the
      // process has exited.
      // const success = data.includes(AC_SUCCESS);
      // const failed = data.includes(AC_FAILURE);
      // if (success || failed) {
      //   console.log('callback disposing');
      //   disposeTerminal(success ? 0 : 1);
      // }
    })
  );

  context.subscriptions.push(
    window.onDidCloseTerminal(async t => {
      if ((await t.processId) === (await terminal.processId)) {
        onDidWriteData ? onDidWriteData(AC_FAILURE) : undefined;
        //disposeTerminal(1);
      }
    })
  );

  return {
    onDidWriteData: callback => {
      onDidWriteData = callback;
      callback(`${displayCommand}\n\r`);
    },
    onExit: callback => {
      onExit = callback;
    },
    kill: () => {
      disposeTerminal(1);
    },
    setCols: () => {
      // No-op, we defer to vscode so as to match its display
    }
  };
}

function unixPseudoTerminalFactory(
  context: ExtensionContext,
  { name, program, args, cwd, displayCommand }: PseudoTerminalConfig
): PseudoTerminal {
  const successMessage = 'Process completed 🙏';
  const failureMessage = 'Process failed 🐳';
  const fullCommand =
    `cd ${cwd} &&` +
    `${program} ${args.join(' ')} && echo "\n\r${successMessage}"` +
    ` || echo "\n\r${failureMessage}"`;

  const terminal = window.createTerminal(name, '/bin/bash', [
    '-c',
    fullCommand
  ]);

  context.subscriptions.push(terminal);

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
            onDidWriteData(`${displayCommand}\n\n\r`);
          }
        }
        return;
      }

      if (onDidWriteData) {
        onDidWriteData(data);
      }

      // Screen scrape for AC_SUCCESS or AC_FAILURE as the signal that the
      // process has exited.
      const success = data.includes(successMessage);
      const failed = data.includes(failureMessage);
      if (success || failed) {
        disposeTerminal(success ? 0 : 1);
      }
    })
  );

  context.subscriptions.push(
    window.onDidCloseTerminal(async t => {
      if ((await t.processId) === (await terminal.processId)) {
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
    },
    setCols: () => {
      // No-op, we defer to vscode so as to match its display
    }
  };
}
