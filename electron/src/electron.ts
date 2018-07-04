import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';
import { statSync } from 'fs';
import * as fixPath from 'fix-path';
import * as getPort from 'get-port';

let win;
let p;

fixPath();

function createWindow() {
  win = new BrowserWindow({ width: 1400, height: 1200 });

  getPort({port: 7777}).then(port => {
    startServer(port).then(() => {
      if (fileExists(path.join(process.cwd(), 'angular.json'))) {
        win.loadURL(`http://localhost:${port}/workspaces/${encodeURIComponent(process.cwd())}/details`);
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

function startServer(port: number) {
  p = spawn('node', ['index.js', port.toString()], {stdio: [0, 1, 2], cwd: path.join(__dirname, 'server'), shell: true});
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
