import {
  createServerModule,
  QueryResolver,
  SelectDirectory,
  Commands,
  Telemetry,
  PseudoTerminalFactory
} from '@angular-console/server';
import { NestFactory } from '@nestjs/core';
import * as path from 'path';
import { commands, ExtensionContext, window, workspace } from 'vscode';
import { environment } from '../environments/environment';
import { executeTask } from './pseudo-terminal.factory';
import { VSCodeStorage } from './vscode-storage';
import * as getPort from 'get-port';
import { Store } from '@nrwl/angular-console-enterprise-electron';

function getPseudoTerminalFactory(): PseudoTerminalFactory {
  return config => executeTask(config);
}

export async function startServer(
  context: ExtensionContext,
  workspacePath?: string
) {
  const port = await getPort({ port: environment.production ? 8888 : 8889 });
  const store = VSCodeStorage.fromContext(context);
  const telemetry = environment.disableTelemetry
    ? Telemetry.withLogger(store)
    : Telemetry.withGoogleAnalytics(store, 'vscode');

  syncTelemetry(store, telemetry);

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

  const exports = [
    'serverAddress',
    'store',
    'selectDirectory',
    'pseudoTerminalFactory',
    'assetsPath',
    'showNotification'
  ];

  const assetsPath = path.join(context.extensionPath, 'assets', 'public');

  const providers = [
    {
      provide: QueryResolver,
      useFactory: (commandsController: Commands) => {
        const resolver = new QueryResolver(store, commandsController);
        if (workspacePath) {
          resolver.workspace(workspacePath, {});
        }
        return resolver;
      },
      inject: ['commands']
    },
    { provide: 'telemetry', useValue: telemetry },
    { provide: 'serverAddress', useValue: `http://localhost:${port}` },
    { provide: 'store', useValue: store },
    { provide: 'selectDirectory', useValue: selectDirectory },
    { provide: 'pseudoTerminalFactory', useValue: getPseudoTerminalFactory() },
    { provide: 'assetsPath', useValue: assetsPath },
    { provide: 'showNotification', useValue: showNotification }
  ];

  const app = await NestFactory.create(createServerModule(exports, providers), {
    cors: true
  });
  app.useStaticAssets(assetsPath);

  return await app.listen(port, 'localhost', () => {});
}

// using shared memory here is a shortcut, this should be an api call
function syncTelemetry(store: Store, telemetry: Telemetry) {
  const enableTelemetry = 'enableTelemetry';
  const configurationSection = VSCodeStorage.configurationSection;
  const telemetrySetting = `${configurationSection}.${enableTelemetry}`;

  workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration(telemetrySetting)) {
      const enabled = store.get(enableTelemetry, false);
      if (enabled) {
        telemetry.startedTracking();
      } else {
        telemetry.stoppedTracking();
      }
    }
  });
}
