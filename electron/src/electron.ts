import { app, BrowserWindow, Menu, dialog  } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';
import { statSync, writeFileSync } from 'fs';
const fixPath = require('fix-path');
const getPort = require('get-port');
import * as os from 'os';
import { autoUpdater } from 'electron-updater';

let win: any;
let p: any;

fixPath();

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
              app.quit();
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
              app.quit();
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
  win = new BrowserWindow({ width: 1400, height: 1200 });

  getPort({port: 7777}).then(port => {
    startServer(port).then(() => {
      if (fileExists(path.join(currentDirectory, 'angular.json'))) {
        win.loadURL(`http://localhost:${port}/workspace/${encodeURIComponent(currentDirectory)}/details`);
      } else {
        win.loadURL(`http://localhost:${port}`);
      }
    });
  });

  win.on('close', () => {
    win = null;
    if (p) {
      p.kill();
    }
    app.quit();
  });
}

function startServer(port: number) {
  console.log('starting server on port', port);
  let started;

  p = spawn('node', ['index.js', port.toString()], {cwd: path.join(__dirname, 'server'), shell: true});
  p.stdout.on('data', (d) => {
    if (d && d.toString().indexOf('AngularConsole Server Started') > -1) {
      started();
    }
    console.log(d && d.toString());
  });
  p.stderr.on('data', (d) => console.log(d && d.toString()));
  p.on('exit', (d) => console.log(d && d.toString()));

  return new Promise(res => started = res);
}

function fileExists(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
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
        console.log('checkForUpdates failed');
        console.log(e.message);
      }
    }
  }, 0);
}

app.on('ready', () => {
  createMenu();
  createWindow();
  checkForUpdates();
});
