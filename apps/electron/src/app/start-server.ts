import {
  nodePtyPseudoTerminalFactory,
  createServerModule,
  Telemetry
} from '@angular-console/server';
import { BrowserWindow, dialog } from 'electron';
import { NestFactory } from '@nestjs/core';
import * as path from 'path';

export async function startServer(
  port: number,
  telemetry: Telemetry,
  mainWindow: BrowserWindow
) {
  try {
    const ElectronStore = require('electron-store');
    const store = new ElectronStore();

    const selectDirectory = async (args: any) => {
      const selection = dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        buttonLabel: args.buttonLabel,
        title: args.title
      });
      return selection[0];
    };

    const exports = [
      'serverAddress',
      'store',
      'selectDirectory',
      'pseudoTerminalFactory',
      'assetsPath'
    ];

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
      }
    ];

    console.log('starting server on port', port);

    const app = await NestFactory.create(
      createServerModule(exports, providers)
    );
    app.useStaticAssets(assetsPath);
    await app.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  } catch (e) {
    telemetry.reportException(`Start Server: ${e.message}`);
    throw e;
  }
}
