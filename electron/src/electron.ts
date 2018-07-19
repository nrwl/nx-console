import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';
import { statSync, writeFileSync } from 'fs';
const fixPath = require('fix-path');
const getPort = require('get-port');
import * as os from 'os';

let win: any;
let p: any;

fixPath();

const currentDirectory = process.cwd();

function createWindow() {
  win = new BrowserWindow({ width: 1400, height: 1200 });

  getPort({port: 7777}).then(port => {
    startServer(port).then(() => {
      if (fileExists(path.join(currentDirectory, 'angular.json'))) {
        win.loadURL(`http://localhost:${port}/workspaces/${encodeURIComponent(currentDirectory)}/details`);
      } else {
        win.loadURL(`http://localhost:${port}`);
      }
    });
  });

  win.on('close', () => {
    win = null;
    app.quit();
    if (p) {
      p.kill();
    }
  });
}

app.on('ready', createWindow);

// TODO: Implement Command-Line Launcher
// function createCommandLineLauncher() {
//   if (os.platform() === "win32") {
//     // TODO: implement this
//   } else if (os.platform() === "linux") {
//     // TODO: implement this
//   } else {
//     writeFileSync('/usr/local/bin/angular-console', `#!/bin/bash
// /Applications/AngularConsole.app/Contents/MacOS/AngularConsole &>/dev/null &
// `);
//   }
// }

function startServer(port: number) {
  p = spawn('node', ['index.js', port.toString()], {cwd: path.join(__dirname, 'server'), shell: true});
  p.stdout.on('data', (d) => console.log(d.toString()));
  p.stderr.on('data', (d) => console.log(d.toString()));
  p.on('exit', (d) => console.log(d.toString()));
  return new Promise(res => {
    setTimeout(() => {
      res();
    }, 300);
  });
}

function fileExists(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}
