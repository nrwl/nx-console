import {app, BrowserWindow, dialog, Menu} from 'electron';
import * as path from 'path';
import {statSync} from 'fs';
import * as os from 'os';
import {autoUpdater} from 'electron-updater';
import {reportEvent, reportException, setUpAnalytics} from './analytics';

const fixPath = require('fix-path');
const getPort = require('get-port');

let win: any;

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
  win = new BrowserWindow({ width: 800, height: 1400 });

  getPort({ port: 7777 }).then((port: number) => {
    try {
      startServer(port);
      if (fileExists(path.join(currentDirectory, 'angular.json'))) {
        win.loadURL(`http://localhost:${port}/workspace/${encodeURIComponent(currentDirectory)}/projects`);
      } else {
        win.loadURL(`http://localhost:${port}`);
      }
    } catch (e) {
      showCloseDialog(`Error when starting Angular Console: ${e.message}`);
      reportException(`Start failed: ${e.message}`);
    }
  });

  win.on('close', () => {
    quit();
  });
}

function startServer(port: number) {
  console.log('starting server on port', port);
  try {
    const { start } = require('./server/index');
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
    message: 'A new version of Angular Console has been downloaded. Restart Angular Console to install the new version.'
  };
  dialog.showMessageBox(dialogOptions, i => {
    if (i === 0) { // Restart
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

app.on('ready', () => {
  if (process.argv[2] === '--server') {
    startServer(8888);
  } else {
    setUpAnalytics();
    startSession();
    createMenu();
    createWindow();
    checkForUpdates();
  }
});
