import { exec, execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

import { exists, findExecutable, hasExecutable } from '../utils';

export function readEditors() {
  const editors = [];
  if (hasFinder()) {
    editors.push({ name: 'Finder', icon: 'finder' });
  }
  if (hasNautilus()) {
    editors.push({ name: 'Files', icon: 'nautilus' });
  }
  if (hasExplorer()) {
    editors.push({ name: 'Explorer', icon: 'explorer' });
  }
  if (hasWebStorm()) {
    editors.push({ name: 'WebStorm', icon: 'webstorm' });
  }
  if (hasIntellij()) {
    editors.push({ name: 'IntelliJ IDEA', icon: 'intellij' });
  }
  if (hasVsCode()) {
    editors.push({ name: 'VS Code', icon: 'vscode' });
  }
  return editors;
}

export function openInEditor(editor: string, path: string) {
  if (editor === 'Finder') {
    openInFinder(path);
  } else if (editor === 'Files') {
    openInNautilus(path);
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

function hasNautilus() {
  return exists('nautilus');
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
    return exists('code');
  } else if (os.platform() === 'win32') {
    try {
      return (
        execSync('code --version')
          .toString()
          .indexOf('is not recognized') === -1
      );
    } catch (e) {
      return false;
    }
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
    return exists('wstorm') || exists('webstorm.sh');
  } else if (os.platform() === 'win32') {
    return hasExecutable('webstorm', process.cwd());
  } else {
    return false;
  }
}

function hasIntellij() {
  if (os.platform() === 'darwin') {
    try {
      const apps = fs.readdirSync('/Applications');
      return apps.indexOf('IntelliJ IDEA.app') > -1;
    } catch (e) {
      return false;
    }
  } else if (os.platform() === 'linux') {
    return exists('idea');
  } else if (os.platform() === 'win32') {
    return hasExecutable('idea', process.cwd());
  } else {
    return false;
  }
}

function openInFinder(path: string) {
  if (os.platform() === 'darwin') {
    spawn('open', [path], { detached: true });
  }
}

function openInNautilus(path: string) {
  exec(`nautilus ${path}`);
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
    exec(`code ${path}`);
  } else if (os.platform() === 'win32') {
    exec(`code "${toWindows(path)}"`);
  }
}

function openInWebStorm(path: string) {
  if (os.platform() === 'darwin') {
    spawn('open', ['-a', 'WebStorm', path], { detached: true });
  } else if (os.platform() === 'linux') {
    if (exists('wstorm')) {
      exec(`wstorm ${path}`);
    } else {
      exec(`webstorm.sh ${path}`);
    }
  } else if (os.platform() === 'win32') {
    spawn(findExecutable('webstorm', process.cwd()), [toWindows(path)], {
      detached: true
    });
  }
}

function openInIntelliJ(path: string) {
  if (os.platform() === 'darwin') {
    spawn('open', ['-a', 'IntelliJ IDEA', path], { detached: true });
  } else if (os.platform() === 'linux') {
    exec(`idea ${path}`);
  } else if (os.platform() === 'win32') {
    spawn(findExecutable('idea', process.cwd()), [toWindows(path)], {
      detached: true
    });
  }
}

function toWindows(path: string): string {
  return path
    .split('/')
    .filter(p => !!p)
    .join('\\');
}
