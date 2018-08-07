import { app, BrowserWindow, Menu, dialog  } from 'electron';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { statSync, writeFileSync } from 'fs';
const fixPath = require('fix-path');
const getPort = require('get-port');
import * as os from 'os';
import { autoUpdater } from 'electron-updater';
import * as semver from 'semver';
import ipcRenderer = Electron.ipcRenderer;
import { reportEvent, reportException, reportPageView } from './analytics';

let win: any;
let p: any;
let sessionStart: number;
const millisecond = 1000;

fixPath();
/**
 * Needs to be set before the electron app is created because of the limit issues with Google Analytics.
 * @type {string}
 */
process.env.trackingID = 'UA-88380372-8';
const currentDirectory = process.cwd();

function createMenu() {
  let menu = [];
  const name = app.getName();
  const common = [
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
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
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
              endSession();
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
              endSession();
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
  win = new BrowserWindow({ width: 800, height: 1400 });

  getPort({ port: 7777 }).then(port => {
    try {
      startServer(port);
      if (fileExists(path.join(currentDirectory, 'angular.json'))) {
        win.loadURL(`http://localhost:${port}/workspace/${encodeURIComponent(currentDirectory)}/projects`);
      } else {
        win.loadURL(`http://localhost:${port}`);
      }
    } catch (e) {
      showCloseDialog(`Error when starting Angular Console: ${e.message}`);
      reportEvent('Electron', 'StartFailed', e.message);
    }
  });

  win.on('close', () => {
    win = null;
    if (p) {
      p.kill();
    }
    endSession();
  });
}

function startServer(port: number) {
  console.log('starting server on port', port);
  const {start} = require('./server/index');
  start(port);
}

function fileExists(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch (err) {
    reportException('File does not exist');
    return false;
  }
}

function showCloseDialog(message: string) {
  reportEvent('CloseDialog', 'Opened', message );
  const dialogOptions = {
    type: 'error',
    buttons: ['Close'],
    message
  };
  dialog.showMessageBox(dialogOptions, i => {
    if (i === 0) {
      endSession();
    }
  });
}

function showRestartDialog() {
  const dialogOptions = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    message: 'A new version of Angular Console has been downloaded. Restart Angular Console to install the new version.'
  };
  dialog.showMessageBox(dialogOptions, i => {
    if (i === 0) { // Restart
      autoUpdater.quitAndInstall();
      reportEvent('Electron', 'Restart', 'QuitAndInstall');
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
        console.log('checkForUpdates failed');
        console.log(e.message);
      }
    }
  }, 0);
}

function endSession() {
  const d = (Date.now() - sessionStart) / millisecond;
  reportEvent('Electron','Session',  'Duration', d, app.quit);
};

function startSession() {
  sessionStart = Date.now();
  reportEvent('Electron','Session',  'Start', sessionStart);
  // TODO: set session cookies here
};

app.on('ready', () => {
  createMenu();
  createWindow();
  checkForUpdates();
});
