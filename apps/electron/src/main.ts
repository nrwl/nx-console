/* tslint:disable */
import {
  readSettings,
  storeSettings,
  Telemetry
} from '@angular-console/server';
import { app, BrowserWindow, dialog, Menu } from 'electron';
import * as ElectronStore from 'electron-store';
import { environment } from './environments/environment';
import { autoUpdater } from 'electron-updater';
import { statSync } from 'fs';
import { platform } from 'os';
import * as path from 'path';
import * as getPort from 'get-port';

import { startServer } from './app/start-server';

const start = process.hrtime();
const fixPath = require('fix-path');

const store = new ElectronStore();

const telemetry = environment.disableTelemetry
  ? Telemetry.withLogger(store)
  : Telemetry.withGoogleAnalytics(store, 'electron');

export let mainWindow: BrowserWindow;

fixPath();
const currentDirectory = process.cwd();

function createMenu() {
  let menu = [];
  const name = app.getName();
  const common: any = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteandmatchstyle' },
        { role: 'delete' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'window',
      submenu: [{ role: 'minimize' }, { role: 'close' }]
    }
  ];
  if (platform() === 'darwin') {
    menu = [
      {
        label: name,
        submenu: [
          {
            label: 'About ' + name,
            role: 'about'
          },
          {
            label: 'Quit ' + name,
            accelerator: 'Command+Q',
            click() {
              quit();
            }
          }
        ]
      },
      ...common
    ];
  } else {
    menu = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Exit',
            accelerator: 'Ctrl+Q',
            click() {
              quit();
            }
          }
        ]
      },
      ...common
    ];
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
}

function createWindow() {
  try {
    const bounds = JSON.parse(store.get('windowBounds') as string);
    mainWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      icon: path.join(__dirname, '/assets/build/icons/icon.png'),
      show: false
    });
  } catch {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 1400,
      icon: path.join(__dirname, '/assets/build/icons/icon.png'),
      show: false
    });
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  getPort({ port: 7968 }).then((port: number) => {
    try {
      startServer(port, telemetry, store, mainWindow).then(() => {
        if (fileExists(path.join(currentDirectory, 'angular.json'))) {
          mainWindow.loadURL(
            `http://localhost:${port}/workspace/${encodeURIComponent(
              currentDirectory
            )}/projects`
          );
        } else {
          mainWindow.loadURL(`http://localhost:${port}`);
        }
      });
    } catch (e) {
      showCloseDialog(`Error when starting Angular Console: ${e.message}`);
      telemetry.exceptionOccured(`Start failed: ${e.message}`);
    }
  });

  mainWindow.on('close', () => {
    saveWindowInfo();
    quit();
  });
}

function fileExists(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

function showCloseDialog(message: string) {
  const dialogOptions = {
    type: 'error',
    buttons: ['Close'],
    message
  };
  dialog.showMessageBox(dialogOptions, i => {
    if (i === 0) {
      quit();
    }
  });
}

function showRestartDialog() {
  const dialogOptions = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    message:
      'A new version of Angular Console has been downloaded. Restart Angular Console to install the new version.'
  };
  dialog.showMessageBox(dialogOptions, i => {
    if (i === 0) {
      // Restart
      autoUpdater.quitAndInstall();
    }
  });
}

function checkForUpdates() {
  setTimeout(async () => {
    autoUpdater.channel = getUpdateChannel();
    autoUpdater.allowDowngrade = false;
    if (!environment.production) {
      try {
        const r = await autoUpdater.checkForUpdates();
        if (r.downloadPromise) {
          await r.downloadPromise;

          // awaiting for downloadPromise isn't a good indication
          // there is a race condition, so we should give the system
          // some time to apply the update
          setTimeout(() => {
            showRestartDialog();
          }, 15000);
        } else {
          console.log('checkForUpdates is called. downloadPromise is null.');
        }
      } catch (e) {
        telemetry.exceptionOccured(e.message);
      }
    }
  }, 0);
}

function getUpdateChannel() {
  const settings = readSettings(store);
  const token = store.get('access_token');
  if (settings.channel === undefined) {
    const channel = token ? 'beta' : 'latest';
    storeSettings(store, { ...settings, channel });
    return channel;
  } else if (token && settings.channel === 'latest') {
    return 'beta';
  } else {
    return settings.channel;
  }
}

function quit() {
  app.quit();
}

function saveWindowInfo() {
  if (mainWindow) {
    try {
      store.set('windowBounds', JSON.stringify(mainWindow.getBounds()));
    } catch (e) {
      telemetry.exceptionOccured(`Saving window bounds failed: ${e.message}`);
    }
  }
}

app.on('ready', async () => {
  if (process.argv[2] === '--server') {
    let port;
    if (process.argv[3] === '--port') {
      port = parseInt(process.argv[4], 10);
    } else {
      port = await getPort({ port: 8888 });
    }
    startServer(port, telemetry, store, mainWindow);
  } else {
    createMenu();
    createWindow();
    checkForUpdates();
    const time = process.hrtime(start);
    telemetry.appLoaded(time[0]);
  }
});
