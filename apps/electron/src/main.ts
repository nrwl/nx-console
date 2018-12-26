/* tslint:disable */
import {
  PseudoTerminalFactory,
  readSettings,
  start,
  storeSettings,
  Telemetry
} from '@angular-console/server';
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { statSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Store } from '@nrwl/angular-console-enterprise-electron';

const fixPath = require('fix-path');
const getPort = require('get-port');

let store: any;
let telemetry: Telemetry;

export let mainWindow: any;

fixPath();
const currentDirectory = process.cwd();

function setupEvents() {
  process.env.trackingID = 'UA-88380372-8';
  ipcMain.on('event', (event: any, arg: any) =>
    telemetry.reportEvent(arg.category, arg.action, arg.label, arg.value)
  );
  ipcMain.on('dataCollectionEvent', (event: any, arg: any) =>
    telemetry.dataCollectionEvent(arg.value)
  );
  ipcMain.on('reportPageView', (event: any, arg: any) =>
    telemetry.reportPageView(arg.path)
  );
  ipcMain.on('reportException', (event: any, arg: any) =>
    telemetry.reportException(arg.description)
  );
}

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
  if (os.platform() === 'darwin') {
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
    const bounds = JSON.parse(store.get('windowBounds'));
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

  getPort({ port: 7777 }).then((port: number) => {
    try {
      startServer(port);
      if (fileExists(path.join(currentDirectory, 'angular.json'))) {
        mainWindow.loadURL(
          `http://localhost:${port}/workspace/${encodeURIComponent(
            currentDirectory
          )}/projects`
        );
      } else {
        mainWindow.loadURL(`http://localhost:${port}`);
      }
    } catch (e) {
      showCloseDialog(`Error when starting Angular Console: ${e.message}`);
      telemetry.reportException(`Start failed: ${e.message}`);
    }
  });

  mainWindow.on('close', () => {
    saveWindowInfo();
    quit();
  });
}

const pseudoTerminalFactory: PseudoTerminalFactory = ({
  command,
  args,
  cwd
}) => {
  const commandRunning = require('node-pty-prebuilt').spawn(command, args, {
    cols: 80,
    cwd
  });

  return {
    onDidWriteData: callback => {
      commandRunning.on('data', callback);
    },
    onExit: callback => {
      commandRunning.on('exit', callback);
    },
    kill: () => {
      if (os.platform() === 'win32') {
        commandRunning.kill();
      } else {
        commandRunning.kill('SIGKILL');
      }
    }
  };
};

function startServer(port: number) {
  const ElectronStore = require('electron-store');
  const store: Store = new ElectronStore();
  console.log('starting server on port', port);

  try {
    start({
      port,
      selectDirectory: args => {
        const selection = dialog.showOpenDialog(mainWindow, {
          properties: ['openDirectory'],
          buttonLabel: args.buttonLabel,
          title: args.title
        });

        return Promise.resolve(selection[0]);
      },
      store,
      staticResourcePath: path.join(__dirname, './assets/public'),
      pseudoTerminalFactory
    });
  } catch (e) {
    telemetry.reportException(`Start Server: ${e.message}`);
    throw e;
  }
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
      telemetry.reportLifecycleEvent('QuitAndInstall');
      autoUpdater.quitAndInstall();
    }
  });
}

function checkForUpdates() {
  setTimeout(async () => {
    autoUpdater.channel = getUpdateChannel();
    if (process.env.NODE_ENV !== 'development') {
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
        telemetry.reportException(e);
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

function startSession() {
  telemetry.reportLifecycleEvent('StartSession');
}

function quit() {
  if (mainWindow) {
    mainWindow = null;
    app.quit();
  }
}

function saveWindowInfo() {
  if (mainWindow) {
    try {
      store.set('windowBounds', JSON.stringify(mainWindow.getBounds()));
    } catch (e) {
      telemetry.reportException(`Saving window bounds failed: ${e.message}`);
    }
  }
}

if (app) {
  const Store = require('electron-store');
  store = new Store();
  telemetry = new Telemetry(store);

  app.on('ready', async () => {
    if (process.argv[2] === '--server') {
      let port;
      if (process.argv[3] === '--port') {
        port = parseInt(process.argv[4], 10);
      } else {
        port = await getPort({ port: 8888 });
      }
      startServer(port);
    } else {
      setupEvents();
      startSession();
      createMenu();
      createWindow();
      checkForUpdates();
    }
  });
}
