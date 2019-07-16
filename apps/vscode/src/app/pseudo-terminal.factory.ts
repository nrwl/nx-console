import {
  PseudoTerminal,
  PseudoTerminalConfig,
  PseudoTerminalFactory,
  readSettings
} from '@angular-console/server';
import { platform } from 'os';
import { ExtensionContext, Terminal, window } from 'vscode';

import { getStoreForContext } from './get-store-for-context';

export function getPseudoTerminalFactory(
  context: ExtensionContext
): PseudoTerminalFactory {
  const store = getStoreForContext(context);

  return config => {
    if (platform() === 'win32') {
      const isWsl = readSettings(store).isWsl;
      if (isWsl) {
        return wslPseudoTerminalFactory(context, config);
      } else {
        return win32PseudoTerminalFactory(context, config);
      }
    }
    return unixPseudoTerminalFactory(context, config);
  };
}

// TODO: Handle WSL Mode
function win32PseudoTerminalFactory(
  context: ExtensionContext,
  { name, program, args, cwd, displayCommand }: PseudoTerminalConfig
): PseudoTerminal {
  const successMessage = 'Process completed #woot';
  const failureMessage = 'Process failed #failwhale';
  const fullCommand = [
    `Try {`,
    `& '${program}' ${args.join(' ')};`,
    `if($?) { echo '\n\r${successMessage}' };`,
    `if(!$?) { echo '\n\r${failureMessage}' };`,
    `} Catch { `,
    `echo '\n\r${failureMessage}'`,
    `}`
  ].join(' ');

  const terminal = window.createTerminal({
    name,
    cwd,
    shellPath: 'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    shellArgs: `-Sta -NoLogo -NonInteractive -C "& {${fullCommand}}"`
  });

  return renderVsCodeTerminal(
    context,
    terminal,
    displayCommand,
    successMessage,
    failureMessage
  );
}

function wslPseudoTerminalFactory(
  context: ExtensionContext,
  { name, program, args, cwd, displayCommand }: PseudoTerminalConfig
): PseudoTerminal {
  const successMessage = 'Process completed #woot';
  const failureMessage = 'Process failed #failwhale';
  const fullCommand =
    `${program} ${args.join(' ')} && echo "\n\r${successMessage}"` +
    ` || echo "\n\r${failureMessage}"`;

  const terminal = window.createTerminal({
    name,
    cwd,
    shellPath: 'C:\\Windows\\System32\\wsl.exe',
    shellArgs: ['-e', 'bash', '-l', '-i', '-c', fullCommand]
  });

  return renderVsCodeTerminal(
    context,
    terminal,
    displayCommand,
    successMessage,
    failureMessage
  );
}

function unixPseudoTerminalFactory(
  context: ExtensionContext,
  { name, program, args, cwd, displayCommand }: PseudoTerminalConfig
): PseudoTerminal {
  const successMessage = 'Process completed 🙏';
  const failureMessage = 'Process failed 🐳';
  const fullCommand =
    `${program} ${args.join(' ')} && echo "\n\r${successMessage}"` +
    ` || echo "\n\r${failureMessage}"`;

  const terminal = window.createTerminal({
    name,
    cwd,
    shellPath: '/bin/bash',
    shellArgs: ['-c', fullCommand]
  });

  return renderVsCodeTerminal(
    context,
    terminal,
    displayCommand,
    successMessage,
    failureMessage
  );
}

function renderVsCodeTerminal(
  context: ExtensionContext,
  terminal: Terminal,
  displayCommand: string,
  successMessage: string,
  failureMessage: string
): PseudoTerminal {
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
        onDidWriteData(data);
      }

      // Screen scrape for successMessage or failureMessage as the signal that the
      // process has exited.
      const success = data.includes(successMessage);
      const failed = data.includes(failureMessage);
      if (success || failed) {
        disposeTerminal(success ? 0 : 1);
      }
    })
  );

  return {
    onDidWriteData: callback => {
      onDidWriteData = callback;
      callback(`${displayCommand}\n\n\r`);
    },
    onExit: callback => {
      onExit = callback;
    },
    kill: () => {
      if (onDidWriteData) {
        onDidWriteData(`\r\n${failureMessage}`);
      }
      disposeTerminal(1);
    },
    setCols: () => {
      // No-op, we defer to vscode so as to match its display
    }
  };
}
