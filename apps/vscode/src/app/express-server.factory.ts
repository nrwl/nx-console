import { ExtensionContext, window } from 'vscode';
import { join } from 'path';
import { start, SelectDirectory } from '@angular-console/server';
import { getPseudoTerminalFactory } from './pseudo-terminal.factory';

const getPort = require('get-port');

const selectDirectory: SelectDirectory = async ({ buttonLabel }) => {
  return await window
    .showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: buttonLabel
    })
    .then(value => {
      if (value && value.length) {
        return value[0].fsPath;
      } else {
        return undefined;
      }
    });
};

export async function startServer(context: ExtensionContext) {
  const port = await getPort({ port: 8888 });

  const staticResourcePath = join(
    context.extensionPath,
    'assets',
    'angular-console'
  );

  const server = start({
    port,
    selectDirectory,
    staticResourcePath,
    store: {
      get: (key: string, defaultValue: any) =>
        context.workspaceState.get(key) || defaultValue,
      set: (key: string, value: any) =>
        context.workspaceState.update(key, value),
      delete: (key: string) => context.workspaceState.update(key, undefined)
    },
    pseudoTerminalFactory: getPseudoTerminalFactory(context)
  });

  console.log(`Angular Console on port : ${port}`);

  return server;
}
