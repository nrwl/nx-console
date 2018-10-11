/* tslint:disable */

import { app, BrowserWindow, dialog, Menu } from 'electron';
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

let win: any;
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
  try {
    const bounds = JSON.parse(store.get('windowBounds'));
    win = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      icon: path.join(__dirname, '/assets/icons/build/icon.png'),
      show: false
    });
  } catch {
    win = new BrowserWindow({
      width: 800,
      height: 1400,
      icon: path.join(__dirname, '/assets/icons/build/icon.png'),
      show: false
    });
  }

  win.on('ready-to-show', () => {
    win.show();
  });

  getPort({ port: 7777 }).then((port: number) => {
    try {
      startServer(port);
      if (fileExists(path.join(currentDirectory, 'angular.json'))) {
        win.loadURL(
          `http://localhost:${port}/workspace/${encodeURIComponent(
            currentDirectory
          )}/projects`
        );
      } else {
        win.loadURL(`http://localhost:${port}`);
      }
    } catch (e) {
      showCloseDialog(`Error when starting Angular Console: ${e.message}`);
      reportException(`Start failed: ${e.message}`);
    }
  });

  win.on('close', () => {
    saveWindowInfo();
    quit();
  });
}

function startServer(port: number) {
  console.log('starting server on port', port);
  try {
    const { start } = require('./server');
    start(port);
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
