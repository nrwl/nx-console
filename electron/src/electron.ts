import {app, BrowserWindow} from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';
import { statSync } from "fs";

let win;
function createWindow () {
  win = new BrowserWindow({width: 1200, height: 900});
  // win.webContents.openDevTools();

  startServer().then(() => {
    if (fileExists(path.join(process.cwd(), "angular.json"))) {
      win.loadURL(`http://localhost:7777/workspaces/${encodeURIComponent(process.cwd())}/details`);
    } else {
      win.loadURL("http://localhost:7777");
    }
  });
}

function startServer() {
  const program = path.join(__dirname, 'server', 'index.js');
  spawn('node', [program], {stdio: [0, 1, 2]});
  return new Promise(res => {
    setTimeout(() => {res()}, 300);
  });
}

app.on('ready', createWindow);

function fileExists(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}
