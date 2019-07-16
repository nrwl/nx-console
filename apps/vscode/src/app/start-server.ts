import {
  createServerModule,
  QueryResolver,
  SelectDirectory
} from '@angular-console/server';
import { NestFactory } from '@nestjs/core';
import * as path from 'path';
import { commands, ExtensionContext, window } from 'vscode';

import { getStoreForContext } from './get-store-for-context';
import { getPseudoTerminalFactory } from './pseudo-terminal.factory';

const getPort = require('get-port'); // tslint:disable-line

export async function startServer(
  context: ExtensionContext,
  workspacePath?: string
) {
  const port = await getPort({ port: 8888 });
  const store = getStoreForContext(context);

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

  const showNotification = (
    message: string,
    notificationCommands: { label: string; action: any }[]
  ) => {
    window
      .showInformationMessage(
        message,
        ...notificationCommands.map(c => c.label)
      )
      .then(res => {
        const selectedCommand = notificationCommands.find(n => n.label === res);
        if (selectedCommand) {
          if (selectedCommand.action.url) {
            const opn = require('opn');
            opn(selectedCommand.action.url);
          } else {
            commands.executeCommand(
              selectedCommand.action.extension,
              undefined,
              selectedCommand.action.route
            );
          }
        }
      });
  };

  const pseudoTerminalFactory = getPseudoTerminalFactory(context);

  const exports = [
    'serverAddress',
    'store',
    'selectDirectory',
    'pseudoTerminalFactory',
    'assetsPath',
    'showNotification'
  ];

  const assetsPath = path.join(context.extensionPath, 'assets', 'public');

  const queryResolver = new QueryResolver(store);

  // Pre-warm cache for workspace.
  if (workspacePath) {
    queryResolver.workspace(workspacePath, {});
  }

  const providers = [
    { provide: QueryResolver, useValue: queryResolver },
    { provide: 'serverAddress', useValue: `http://localhost:${port}` },
    { provide: 'store', useValue: store },
    { provide: 'selectDirectory', useValue: selectDirectory },
    { provide: 'pseudoTerminalFactory', useValue: pseudoTerminalFactory },
    { provide: 'assetsPath', useValue: assetsPath },
    { provide: 'showNotification', useValue: showNotification }
  ];

  console.log('starting server on port', port);

  const app = await NestFactory.create(createServerModule(exports, providers), {
    cors: true
  });
  (app as any).useStaticAssets(assetsPath);

  return await app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}
