import { Logger } from '@nx-console/shared-utils';
import { Connection } from 'vscode-languageserver';

let log: Console['log'] | undefined;
let enableDebugLogging = false;

export function setLspLogger(connection: Connection, debugLogging = false) {
  if (!log) {
    log = connection.console.log.bind(connection.console);
    enableDebugLogging = debugLogging;
  } else {
    throw `Can't set logger twice`;
  }
}

export const lspLogger: Logger = {
  log(message: string, ...args: any[]) {
    log?.(
      `[Nxls] - ${new Date(Date.now()).toISOString()} - ${message}\n`,
      ...args,
    );
  },
  debug(message: string, ...args: any[]) {
    if (enableDebugLogging) {
      log?.(
        `[Nxls] - ${new Date(Date.now()).toISOString()} - ${message}\n`,
        ...args,
      );
    }
  },
};
