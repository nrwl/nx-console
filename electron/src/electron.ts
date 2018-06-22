import {app, BrowserWindow} from 'electron';
import * as url from 'url';
import * as path from 'path';
import { spawn } from 'child_process';

let win;
function createWindow () {
  win = new BrowserWindow({width: 800, height: 600});
  win.webContents.openDevTools();

  startServer().then(() => {
    win.loadURL("http://localhost:7777");
  });
}

function startServer() {
  const program = path.join(__dirname, 'server', 'index.js');
  spawn('node', [program], {stdio: [0, 1, 2]});
  return new Promise(res => {
    setTimeout(() => {res()}, 500);
  });
}

app.on('ready', createWindow);
