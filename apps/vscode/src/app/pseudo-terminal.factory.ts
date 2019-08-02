import {
  PseudoTerminal,
  PseudoTerminalConfig,
  PseudoTerminalFactory,
  readSettings
} from '@angular-console/server';
import { platform } from 'os';
import { Disposable, ExtensionContext, Terminal, window } from 'vscode';

import { getStoreForContext } from './get-store-for-context';

let terminalsToReuse: Array<Terminal> = [];
window.onDidCloseTerminal(e => {
  terminalsToReuse = terminalsToReuse.filter(t => t.processId !== e.processId);
});

const DISPOSE_MESSAGE = 'Press any key to close this terminal';

export function getPseudoTerminalFactory(
  context: ExtensionContext
): PseudoTerminalFactory {
  const store = getStoreForContext(context);

  return config => {
    if (platform() === 'win32') {
      const isWsl = readSettings(store).isWsl;
      if (isWsl) {
        return wslPseudoTerminalFactory(config);
      } else {
        return win32PseudoTerminalFactory(config);
      }
    }
    return unixPseudoTerminalFactory(config);
  };
}

function win32PseudoTerminalFactory({
  name,
  program,
  args,
  cwd,
  displayCommand
}: PseudoTerminalConfig): PseudoTerminal {
  const successMessage = 'Process completed #woot';
  const failureMessage = 'Process failed #failwhale';
  const fullCommand = [
    `echo '${displayCommand}\n'; Try {`,
    `& '${program}' ${args.join(' ')};`,
    `if($?) { echo '\n\n${successMessage}\n\n${DISPOSE_MESSAGE}' };`,
    `if(!$?) { echo '\n\n${failureMessage}\n\n${DISPOSE_MESSAGE}' };`,
    `} Catch { `,
    `echo '\n\r${failureMessage}'`,
    `}; $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown');`
  ].join(' ');

  const terminal = window.createTerminal({
    name,
    cwd,
    shellPath: 'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    shellArgs: `-Sta -NoLogo -NonInteractive -C "& {${fullCommand}}"`
  });

  return renderVsCodeTerminal(terminal, successMessage, failureMessage);
}

function wslPseudoTerminalFactory(
  config: PseudoTerminalConfig
): PseudoTerminal {
  const successMessage = 'Process completed #woot';
  const failureMessage = 'Process failed #failwhale';

  const terminal = window.createTerminal({
    name,
    cwd: config.cwd,
    shellPath: 'C:\\Windows\\System32\\wsl.exe',
    shellArgs: [
      '-e',
      'bash',
      '-l',
      '-c',
      getBashScriptForCommand(config, successMessage, failureMessage)
    ]
  });

  return renderVsCodeTerminal(terminal, successMessage, failureMessage);
}

function unixPseudoTerminalFactory(
  config: PseudoTerminalConfig
): PseudoTerminal {
  const successMessage = 'Process completed 🙏';
  const failureMessage = 'Process failed 🐳';

  const terminal = window.createTerminal({
    name,
    cwd: config.cwd,
    shellPath: '/bin/bash',
    shellArgs: [
      '-l',
      '-i',
      '-c',
      getBashScriptForCommand(config, successMessage, failureMessage)
    ]
  });

  return renderVsCodeTerminal(terminal, successMessage, failureMessage);
}

function getBashScriptForCommand(
  config: PseudoTerminalConfig,
  successMessage: string,
  failureMessage: string
) {
  const { displayCommand, program, args } = config;
  return (
    `echo "${displayCommand}\n" && ${program} ${args.join(
      ' '
    )} && read -n 1 -s -r -p $"\n\n${successMessage}\n\n${DISPOSE_MESSAGE}"` +
    `  || read -n 1 -s -r -p $"\n\n${failureMessage}\n\n${DISPOSE_MESSAGE}"`
  );
}

function renderVsCodeTerminal(
  terminal: Terminal,
  successMessage: string,
  failureMessage: string
): PseudoTerminal {
  const reusableTerminal = terminalsToReuse.pop();
  if (reusableTerminal) {
    reusableTerminal.dispose();
  }

  terminal.show();

  let onDidWriteData: ((data: string) => void) | undefined;
  let onExit: ((code: number) => void) | undefined;

  let disposeOnDidWriteData: Disposable | undefined;
  const disposeTerminal = (code: number) => {
    if (onExit) {
      onExit(code);
    }
    if (disposeOnDidWriteData) {
      disposeOnDidWriteData.dispose();
    }
    onExit = undefined;
    onDidWriteData = undefined;
    disposeOnDidWriteData = undefined;
  };

  disposeOnDidWriteData = (<any>terminal).onDidWriteData((data: string) => {
    // Screen scrape for successMessage or failureMessage as the signal that the
    // process has exited.
    const success = data.includes(successMessage);
    const failed = data.includes(failureMessage);
    if (success || failed) {
      if (onDidWriteData) {
        onDidWriteData(data.replace(DISPOSE_MESSAGE, ''));
      }

      disposeTerminal(success ? 0 : 1);
    } else if (onDidWriteData) {
      onDidWriteData(data);
    }
  });

  return {
    onDidWriteData: callback => {
      onDidWriteData = callback;
    },
    onExit: callback => {
      onExit = code => {
        terminalsToReuse.push(terminal);
        callback(code);
      };
    },
    kill: () => {
      if (onDidWriteData) {
        onDidWriteData(`\r\n${failureMessage}`);
      }
      if (terminal) {
        terminal.dispose();
      }
      disposeTerminal(1);
    }
  };
}
