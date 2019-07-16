import { createServerModule, Telemetry } from '@angular-console/server';
import { NestFactory } from '@nestjs/core';
import { Store } from '@nrwl/angular-console-enterprise-electron';
import { BrowserWindow, dialog } from 'electron';
import { static as staticAssets } from 'express';
import * as path from 'path';

import { nodePtyPseudoTerminalFactory } from './pseudo-terminal.factory';

export async function startServer(
  port: number,
  telemetry: Telemetry,
  store: Store,
  mainWindow: BrowserWindow
) {
  try {
    const selectDirectory = async (args: any) => {
      const selection = dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        buttonLabel: args.buttonLabel,
        title: args.title
      });
      if (selection && selection.length > 0) {
        return selection[0];
      } else {
        return undefined;
      }
    };

    const exports = [
      'serverAddress',
      'store',
      'selectDirectory',
      'pseudoTerminalFactory',
      'assetsPath',
      'showNotification'
    ];

    const showNotification = () => {
      // todo, implement this
    };

    const assetsPath = path.join(__dirname, 'assets/public');
    const providers = [
      { provide: 'serverAddress', useValue: `http://localhost:${port}` },
      { provide: 'store', useValue: store },
      { provide: 'selectDirectory', useValue: selectDirectory },
      {
        provide: 'pseudoTerminalFactory',
        useValue: nodePtyPseudoTerminalFactory
      },
      {
        provide: 'assetsPath',
        useValue: assetsPath
      },
      {
        provide: 'showNotification',
        useValue: showNotification
      }
    ];

    console.log('starting server on port', port);

    const app = await NestFactory.create(
      createServerModule(exports, providers)
    );
    app.use(staticAssets(assetsPath));

    return await app.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  } catch (e) {
    telemetry.reportException(`Start Server: ${e.message}`);
    throw e;
  }
}
