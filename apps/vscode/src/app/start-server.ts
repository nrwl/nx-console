import { ExtensionContext, window } from 'vscode';
import { createServerModule, SelectDirectory } from '@angular-console/server';
import { getPseudoTerminalFactory } from './pseudo-terminal.factory';
import { NestFactory } from '@nestjs/core';
import * as path from 'path';

const getPort = require('get-port'); // tslint:disable-line

export async function startServer(context: ExtensionContext) {
  const port = await getPort({ port: 8888 });
  const store = {
    get: (key: string, defaultValue: any) =>
      context.globalState.get(key) || defaultValue,
    set: (key: string, value: any) => context.globalState.update(key, value),
    delete: (key: string) => context.globalState.update(key, undefined)
  };

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

  const pseudoTerminalFactory = getPseudoTerminalFactory(context);

  const exports = [
    'serverAddress',
    'store',
    'selectDirectory',
    'pseudoTerminalFactory',
    'assetsPath'
  ];

  const assetsPath = path.join(context.extensionPath, 'assets', 'public');

  const providers = [
    { provide: 'serverAddress', useValue: `http://localhost:${port}` },
    { provide: 'store', useValue: store },
    { provide: 'selectDirectory', useValue: selectDirectory },
    { provide: 'pseudoTerminalFactory', useValue: pseudoTerminalFactory },
    { provide: 'assetsPath', useValue: assetsPath }
  ];

  console.log('starting server on port', port);

  const app = await NestFactory.create(createServerModule(exports, providers), {
    cors: true
  });
  app.useStaticAssets(assetsPath);

  return {
    server: await app.listen(port, () => {
      console.log(`Listening on port ${port}`);
    }),
    store
  };
}
