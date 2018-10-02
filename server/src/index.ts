/* tslint:disable */
import { app, BrowserWindow, dialog, Menu, ipcMain } from 'electron';
import * as path from 'path';
import { statSync } from 'fs';
import * as os from 'os';
import { autoUpdater } from 'electron-updater';
import {
  reportEvent,
  reportException,
  setupEvents
} from './analytics_and_settings';

const fixPath = require('fix-path');
const getPort = require('get-port');
const Store = require('electron-store');

let win: BrowserWindow | null;
const store = new Store();

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
  Promise.all([getPort({ port: 7777 }), getPort({ port: 9999 })]).then(
    ([frontendPort, backendPort]: number[]) => {
      try {
        startFrontend(frontendPort);
        try {
          win = new BrowserWindow(JSON.parse(store.get('windowBounds')));
        } catch {
          win = new BrowserWindow({
            width: 800,
            height: 1400,
            icon: path.join(__dirname, '/assets/icons/build/icon.png')
          });
        }
        if (fileExists(path.join(currentDirectory, 'angular.json'))) {
          win.loadURL(
            `http://localhost:${frontendPort}/workspace/${encodeURIComponent(
              currentDirectory
            )}/projects`
          );
        } else {
          win.loadURL(`http://localhost:${frontendPort}`);
        }

        startServer(backendPort, frontendPort);
        win.webContents.send('backend.ready', backendPort);
        ipcMain.on('backend.ready', event => {
          event.sender.send('backend.ready', backendPort);
        });

        win.on('close', () => {
          saveWindowInfo();
          quit();
        });
      } catch (e) {
        showCloseDialog(`Error when starting Angular Console: ${e.message}`);
        reportException(`Start failed: ${e.message}`);
      }
    }
  );
}

function startFrontend(port: number) {
  console.log('starting frontend server on port', port);
  try {
    const { start } = require('./server.frontend');
    start(port);
  } catch (e) {
    reportException(`Start FrontendServer: ${e.message}`);
    throw e;
  }
}

function startServer(port: number, frontendPort?: number) {
  console.log('starting server on port', port);
  try {
    const { start } = require('./server');
    start(port, frontendPort);
  } catch (e) {
    reportException(`Start Server: ${e.message}`);
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
      reportEvent('Lifecycle', 'QuitAndInstall');
      autoUpdater.quitAndInstall();
    }
  });
}

function checkForUpdates() {
  setTimeout(async () => {
    if (process.env.NODE_ENV !== 'development') {
      try {
        const r = await autoUpdater.checkForUpdates();
        if (r.downloadPromise) {
          await r.downloadPromise;
          showRestartDialog();
        } else {
          console.log('checkForUpdates is called. downloadPromise is null.');
        }
      } catch (e) {
        reportException(e);
      }
    }
  }, 0);
}

function startSession() {
  reportEvent('Lifecycle', 'StartSession');
}

function quit() {
  if (win) {
    win = null;
    app.quit();
  }
}

function saveWindowInfo() {
  if (win) {
    try {
      store.set('windowBounds', JSON.stringify(win.getBounds()));
    } catch (e) {
      reportException(`Saving window bounds failed: ${e.message}`);
    }
  }
}

app.on('ready', () => {
  if (process.argv[2] === '--server') {
    const defaultPort = 8888;
    startServer(defaultPort);
  } else {
    setupEvents();
    startSession();
    createMenu();
    createWindow();
    checkForUpdates();
  }
});
