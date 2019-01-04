import { Store } from '@nrwl/angular-console-enterprise-electron';
import {
  start,
  Telemetry,
  nodePtyPseudoTerminalFactory
} from '@angular-console/server';
import { dialog, BrowserWindow } from 'electron';
import { join } from 'path';

export function startServer(
  port: number,
  telemetry: Telemetry,
  mainWindow: BrowserWindow
) {
  const ElectronStore = require('electron-store');
  const store: Store = new ElectronStore();
  console.log('starting server on port', port);

  try {
    start({
      port,
      selectDirectory: async args => {
        const selection = dialog.showOpenDialog(mainWindow, {
          properties: ['openDirectory'],
          buttonLabel: args.buttonLabel,
          title: args.title
        });

        return selection[0];
      },
      store,
      staticResourcePath: join(__dirname, './assets/public'),
      pseudoTerminalFactory: nodePtyPseudoTerminalFactory
    });
  } catch (e) {
    telemetry.reportException(`Start Server: ${e.message}`);
    throw e;
  }
}
