import * as fs from 'fs';
import * as os from 'os';
import { spawn, exec, execSync } from 'child_process';

export function readEditors() {
  const editors = [];
  if (hasFinder()) {
    editors.push({ name: 'Finder', icon: 'finder' });
  }
  if (hasExplorer()) {
    editors.push({ name: 'Explorer', icon: 'explorer' });
  }
  if (hasVsCode()) {
    editors.push({ name: 'VS Code', icon: 'vscode' });
  }
  if (hasWebStorm()) {
    editors.push({ name: 'WebStorm', icon: 'webstorm' });
  }
  if (hasIntellij()) {
    editors.push({ name: 'IntelliJ IDEA', icon: 'intellij' });
  }
  return editors;
}

export function openInEditor(editor: string, path: string) {
  if (editor === 'Finder') {
    openInFinder(path);
  } else if (editor === 'Explorer') {
    openInExplorer(path);
  } else if (editor === 'VS Code') {
    openInVsCode(path);
  } else if (editor === 'WebStorm') {
    openInWebStorm(path);
  } else if (editor === 'IntelliJ IDEA') {
    openInIntelliJ(path);
  } else {
    throw new Error(`Unknown editor: ${editor}`);
  }
}

function hasFinder() {
  return os.platform() === 'darwin';
}

function hasExplorer() {
  return os.platform() === 'win32';
}

function hasVsCode() {
  if (os.platform() === 'darwin') {
    try {
      const apps = fs.readdirSync('/Applications');
      return apps.indexOf('Visual Studio Code.app') > -1;
    } catch (e) {
      return false;
    }
  } else if (os.platform() === 'linux') {
    // TODO implement linux support
    return false;
  } else if (os.platform() === 'win32') {
    return execSync('code --version').indexOf('is not recognized') === -1;
  } else {
    return false;
  }
}

function hasWebStorm() {
  if (os.platform() === 'darwin') {
    try {
      const apps = fs.readdirSync('/Applications');
      return apps.indexOf('WebStorm.app') > -1;
    } catch (e) {
      return false;
    }
  } else if (os.platform() === 'linux') {
    // TODO implement linux support
    return false;
  } else if (os.platform() === 'win32') {
    // TODO implement windows support
    return false;
  } else {
    return false;
  }
}

function hasIntellij() {
  if (os.platform() === 'darwin') {
    try {
      const apps = fs.readdirSync('/Applications');
      return apps.indexOf('IntelliJ IDEA') > -1;
    } catch (e) {
      return false;
    }
  } else if (os.platform() === 'linux') {
    // TODO implement linux support
    return false;
  } else if (os.platform() === 'win32') {
    // TODO implement windows support
    return false;
  } else {
    return false;
  }
}

function openInFinder(path: string) {
  if (os.platform() === 'darwin') {
    spawn('open', [path], { detached: true });
  }
}

function openInExplorer(path: string) {
  if (os.platform() === 'win32') {
    exec(`start "" "${path}"`);
  }
}

function openInVsCode(path: string) {
  if (os.platform() === 'darwin') {
    spawn('open', ['-a', 'Visual Studio Code', path], { detached: true });
  } else if (os.platform() === 'linux') {
    // TODO implement linux support
  } else if (os.platform() === 'win32') {
    exec(`code "${path}"`);
  }
}

function openInWebStorm(path: string) {
  if (os.platform() === 'darwin') {
    spawn('open', ['-a', 'WebStorm', path], { detached: true });
  } else if (os.platform() === 'linux') {
    // TODO implement linux support
  } else if (os.platform() === 'win32') {
    // TODO implement windows support
  }
}

function openInIntelliJ(path: string) {
  if (os.platform() === 'darwin') {
    spawn('open', ['-a', 'IntelliJ IDEA', path], { detached: true });
  } else if (os.platform() === 'linux') {
    // TODO implement linux support
  } else if (os.platform() === 'win32') {
    // TODO implement windows support
  }
}
