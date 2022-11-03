import { Logger } from '@nx-console/shared/schema';
import { Connection } from 'vscode-languageserver';

let log: Console['log'] | undefined;

export function setLspLogger(connection: Connection) {
  if (!log) {
    log = connection.console.log.bind(connection.console);
  } else {
    throw `Can't set logger twice`;
  }
}

export const lspLogger: Logger = {
  log(message: string, ...args: any[]) {
    log?.(
      `[Nxls] - ${new Date(Date.now()).toISOString()} - ${message}\n`,
      ...args
    );
  },
};
